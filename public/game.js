/*
 * Novuss — game engine: table geometry, physics, LNF rules and a computer player.
 * Rule numbers in comments refer to "Novusa spēles noteikumi" of the Latvian Novuss
 * Federation (LNF), approved 9 March 2024, amended 9 March 2025.
 *
 * Coordinates are millimetres on the 1000 × 1000 playing field, origin in the top-left
 * inner corner. Side 'S' is the bottom cushion (y = 1000), side 'N' the top one (y = 0).
 * "Relative" coordinates are rotated so that the shooter's own cushion is at y = 1000.
 */
(function (root) {
  'use strict';

  // Equipment (LNF "Sacensību inventārs").
  const C = {
    FIELD: 1000,          // playing field 1000 × 1000 (item 2)
    RAIL: 45,             // cushion width (item 5)
    ZONE: 130,            // edge-zone lines 130 mm from each cushion (item 11)
    LINE_W: 1,            // 1 mm black lines (item 10)
    CIRCLE_R: 125,        // centre circle Ø 250 (item 12)
    POCKET_R: 50,         // holes Ø 100 (item 8) ...
    POCKET_C: 65,         // ... 15 mm from the cushions (item 9)
    STRIKER_R: 22.25,     // ripa Ø 44.5 (item 16)
    STRIKER_HOLE_R: 5,    // hole Ø 10 (item 18)
    STRIKER_M: 22,        // 22 g (item 19)
    PUCK_R: 15,           // kauliņš Ø 30 (item 20)
    PUCK_HOLE_R: 4,       // hole Ø 8 (item 22)
    PUCK_M: 5,            // 5 g (item 23)

    // Physics tuning (powdered plywood, hardwood cushions).
    E_PUCK: 0.9,          // restitution between pieces
    E_CUSHION: 0.75,      // restitution against cushions
    DECEL: 950,           // sliding friction, mm/s²
    DAMP: 0.18,           // speed-proportional drag, 1/s
    JUMP_SPEED: 6500,     // a puck hitting a cushion faster than this flies off the table
    MIN_SPEED: 150,
    MAX_SPEED: 4500,
    DT: 0.0005,
    CUE_MARGIN: 10        // the cue must not cover the cushion's inner corner (3.32)
  };

  const POCKETS = [
    [C.POCKET_C, C.POCKET_C], [C.FIELD - C.POCKET_C, C.POCKET_C],
    [C.POCKET_C, C.FIELD - C.POCKET_C], [C.FIELD - C.POCKET_C, C.FIELD - C.POCKET_C]
  ];
  const MID = C.FIELD / 2;
  const HALF_LINE = C.LINE_W / 2;
  const ZONE_LINE = C.FIELD - C.ZONE; // the shooter's edge-zone line, relative coordinates

  // Where the striker may be placed (3.9): inside the own edge zone, between the zone's
  // side lines and end line, with none of them visible through the striker's hole.
  const PLACE = {
    xMin: C.ZONE + HALF_LINE + C.STRIKER_HOLE_R + 0.01,
    xMax: C.FIELD - C.ZONE - HALF_LINE - C.STRIKER_HOLE_R - 0.01,
    yMin: ZONE_LINE + HALF_LINE + C.STRIKER_HOLE_R + 0.01,
    yMax: C.FIELD - C.STRIKER_R
  };

  // Math.hypot may round differently between JavaScript engines; sqrt is exact everywhere,
  // which keeps a shot replayed in the browser identical to the server's.
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }

  // Rotate between absolute and side-relative coordinates (the map is its own inverse).
  function flip(side, x, y) {
    return side === 'S' ? [x, y] : [C.FIELD - x, C.FIELD - y];
  }
  function flipDir(side, dx, dy) {
    return side === 'S' ? [dx, dy] : [-dx, -dy];
  }

  // Which dark area of the player on `side` a piece lies in (2.3, 2.13): 'strip' for the
  // band along that player's cushion, 'circle' for the centre circle, null otherwise.
  // A piece is inside only when the bounding line is no longer visible through its hole.
  function area(side, x, y, holeR) {
    const ry = flip(side, x, y)[1];
    if (ry - holeR > ZONE_LINE + HALF_LINE) return 'strip';
    if (hyp(x - MID, y - MID) + holeR < C.CIRCLE_R - HALF_LINE) return 'circle';
    return null;
  }

  function segDist(ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return hyp(ax + dx * t - px, ay + dy * t - py);
  }

  function powerToSpeed(p) {
    return C.MIN_SPEED + (C.MAX_SPEED - C.MIN_SPEED) * Math.pow(p, 1.5);
  }
  function speedToPower(v) {
    return Math.pow(Math.max(0, (v - C.MIN_SPEED) / (C.MAX_SPEED - C.MIN_SPEED)), 1 / 1.5);
  }

  /* ------------------------------------------------------------------ physics */

  class Sim {
    constructor(pucks, striker, shooterSide) {
      const body = (o, r, m, isStriker) => ({
        id: o.id, owner: o.owner, x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
        r, inv: 1 / m, on: true, striker: isStriker
      });
      this.side = shooterSide;
      this.t = 0;
      this.striker = body({ id: -1, owner: -1, x: striker.x, y: striker.y, vx: striker.vx, vy: striker.vy },
        C.STRIKER_R, C.STRIKER_M, true);
      this.bodies = [this.striker].concat(pucks.map(k => body(k, C.PUCK_R, C.PUCK_M, false)));
      this.log = {
        cushionsBefore: [],   // cushions the striker touched before its first piece
        firstContact: null,   // ids of the piece(s) the striker touched first
        pocketed: [],
        off: [],              // pieces that flew over a cushion: { id, wall }
        strikerPocketed: false,
        strikerOff: false,
        strikerLeft: false,   // striker has crossed out of the own edge zone
        strikerReturned: false
      };
      this.events = null;     // set to [] to collect events for sound and animation
    }

    emit(type, b, power) {
      if (this.events) this.events.push({ type, x: b.x, y: b.y, power, striker: b.striker, id: b.id, t: this.t });
    }

    cushion(b, wall, vn, axis, lim) {
      b[axis] = lim;
      if (vn > 0) {
        if (!b.striker && vn > C.JUMP_SPEED) {
          b.on = false;
          b.vx = b.vy = 0;
          this.log.off.push({ id: b.id, wall });
          this.emit('off', b, vn);
          return;
        }
        if (axis === 'x') b.vx = -b.vx * C.E_CUSHION; else b.vy = -b.vy * C.E_CUSHION;
        this.emit('cushion', b, vn);
      }
      const log = this.log;
      if (b.striker && log.firstContact === null && log.cushionsBefore.indexOf(wall) < 0) log.cushionsBefore.push(wall);
    }

    step(dt) {
      const B = this.bodies, n = B.length, log = this.log;
      this.t += dt;

      for (let i = 0; i < n; i++) {
        const b = B[i];
        if (!b.on || (b.vx === 0 && b.vy === 0)) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const sp = hyp(b.vx, b.vy);
        const ns = sp - (C.DECEL + C.DAMP * sp) * dt;
        if (ns <= 0) { b.vx = 0; b.vy = 0; } else { b.vx *= ns / sp; b.vy *= ns / sp; }
      }

      let contacts = null;
      for (let i = 0; i < n; i++) {
        const a = B[i];
        if (!a.on) continue;
        for (let j = i + 1; j < n; j++) {
          const b = B[j];
          if (!b.on) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rs = a.r + b.r, d2 = dx * dx + dy * dy;
          if (d2 >= rs * rs - 1e-6) continue;
          const d = Math.sqrt(d2) || 1e-9, nx = dx / d, ny = dy / d, inv = a.inv + b.inv;
          const corr = (rs - d) / inv;
          a.x -= nx * corr * a.inv; a.y -= ny * corr * a.inv;
          b.x += nx * corr * b.inv; b.y += ny * corr * b.inv;
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) {
            const J = -(1 + C.E_PUCK) * vn / inv;
            a.vx -= J * a.inv * nx; a.vy -= J * a.inv * ny;
            b.vx += J * b.inv * nx; b.vy += J * b.inv * ny;
            this.emit('hit', a.striker ? a : b, -vn);
          }
          if (a.striker && log.firstContact === null) (contacts || (contacts = [])).push(b.id);
        }
      }
      if (contacts) log.firstContact = contacts;

      for (let i = 0; i < n; i++) {
        const b = B[i];
        if (!b.on) continue;
        const r = b.r, max = C.FIELD - r;
        if (b.x < r) this.cushion(b, 'W', -b.vx, 'x', r);
        else if (b.x > max) this.cushion(b, 'E', b.vx, 'x', max);
        if (!b.on) continue;
        if (b.y < r) this.cushion(b, 'N', -b.vy, 'y', r);
        else if (b.y > max) this.cushion(b, 'S', b.vy, 'y', max);
        if (!b.on) continue;
        for (let k = 0; k < 4; k++) {
          const px = b.x - POCKETS[k][0], py = b.y - POCKETS[k][1];
          if (px * px + py * py < C.POCKET_R * C.POCKET_R) {
            b.on = false;
            this.emit('pocket', b, hyp(b.vx, b.vy));
            b.vx = b.vy = 0;
            b.pocket = k;
            if (b.striker) log.strikerPocketed = true; else log.pocketed.push(b.id);
            break;
          }
        }
      }

      // 3.15: once out of the edge zone, the striker must not slide back in.
      const s = this.striker;
      if (s.on) {
        const ry = flip(this.side, s.x, s.y)[1];
        if (!log.strikerLeft) {
          if (ry < ZONE_LINE - HALF_LINE - C.STRIKER_HOLE_R) log.strikerLeft = true;
        } else if (ry > ZONE_LINE + HALF_LINE + C.STRIKER_HOLE_R) log.strikerReturned = true;
      }
    }

    atRest() {
      for (const b of this.bodies) if (b.on && (b.vx !== 0 || b.vy !== 0)) return false;
      return true;
    }

    // Advance by `dt` seconds of game time in fixed sub-steps.
    advance(dt) {
      this.acc = (this.acc || 0) + dt;
      while (this.acc >= C.DT) {
        this.acc -= C.DT;
        if (this.atRest()) { this.acc = 0; break; }
        this.step(C.DT);
      }
    }

    run(maxT) {
      const end = this.t + (maxT || 60);
      while (!this.atRest() && this.t < end) this.step(C.DT);
      if (!this.atRest()) for (const b of this.bodies) b.vx = b.vy = 0;
    }
  }

  /* -------------------------------------------------------------------- game */

  const STATE_KEYS = ['setsToWin', 'matchFirst', 'sets', 'setNo', 'sides', 'winner', 'first', 'turn',
    'series', 'debt', 'firstClear', 'miss', 'pucks'];

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.setsToWin = opts.setsToWin || 2;
      this.matchFirst = opts.first || 0;
      this.sets = [0, 0];
      this.setNo = 1;
      this.sides = ['S', 'N'];
      this.winner = null;
      this.newSet(this.matchFirst);
    }

    // 1.2: each player's eight pucks in a tight row against the cushion on the
    // opponent's side, four on each side of the midline.
    newSet(first) {
      this.first = first;
      this.turn = first;
      this.series = [0, 0];
      this.series[first] = 1;
      this.debt = [0, 0];
      this.firstClear = null;
      this.miss = [0, 0];
      this.pre = null;
      this.pucks = [];
      for (let p = 0; p < 2; p++) {
        for (let k = 0; k < 8; k++) {
          const xy = flip(this.sides[p], MID + (k - 3.5) * 2 * C.PUCK_R, C.PUCK_R);
          this.pucks.push({ id: p * 8 + k, owner: p, x: xy[0], y: xy[1], on: true });
        }
      }
    }

    // Plain data for the network; Game.fromJSON restores it. A deep copy, so a snapshot
    // taken before a shot is not changed by the shot.
    toJSON() {
      const o = {};
      for (const k of STATE_KEYS) o[k] = this[k];
      return JSON.parse(JSON.stringify(o));
    }

    static fromJSON(o) {
      const g = Object.create(Game.prototype);
      for (const k of STATE_KEYS) g[k] = o[k];
      g.pre = null;
      return g.clone();
    }

    clone() {
      const g = Object.create(Game.prototype);
      Object.assign(g, this);
      g.sets = this.sets.slice();
      g.sides = this.sides.slice();
      g.series = this.series.slice();
      g.debt = this.debt.slice();
      g.miss = this.miss.slice();
      g.pucks = this.pucks.map(k => Object.assign({}, k));
      g.pre = null;
      return g;
    }

    onTable(p) {
      let n = 0;
      for (const k of this.pucks) if (k.on && k.owner === p) n++;
      return n;
    }
    isDark(k) { return area(this.sides[k.owner], k.x, k.y, C.PUCK_HOLE_R) !== null; }
    // Any piece in the band along player p's own cushion: never a valid direct first target.
    inOwnStrip(p, k) { return area(this.sides[p], k.x, k.y, C.PUCK_HOLE_R) === 'strip'; }
    hasLight(p) { return this.pucks.some(k => k.on && k.owner === p && !this.isDark(k)); }
    hasDark(p) { return this.pucks.some(k => k.on && k.owner === p && this.isDark(k)); }

    // 3.9, 3.10: striker inside the own edge zone, touching no puck.
    canPlace(p, x, y) {
      const r = flip(this.sides[p], x, y);
      if (r[0] < PLACE.xMin || r[0] > PLACE.xMax || r[1] < PLACE.yMin || r[1] > PLACE.yMax) return false;
      const m = C.STRIKER_R + C.PUCK_R;
      for (const k of this.pucks) if (k.on && (k.x - x) * (k.x - x) + (k.y - y) * (k.y - y) < m * m) return false;
      return true;
    }

    // Move a requested striker position to the closest legal one by clamping it to the
    // zone and sliding it off pucks. Returns null if that fails.
    slidePlace(p, x, y) {
      const side = this.sides[p], m = C.STRIKER_R + C.PUCK_R + 0.01;
      let r = flip(side, x, y);
      for (let it = 0; it < 8; it++) {
        r = [Math.max(PLACE.xMin, Math.min(PLACE.xMax, r[0])), Math.max(PLACE.yMin, Math.min(PLACE.yMax, r[1]))];
        const a = flip(side, r[0], r[1]);
        if (this.canPlace(p, a[0], a[1])) return a;
        for (const k of this.pucks) {
          if (!k.on) continue;
          const kr = flip(side, k.x, k.y), dx = r[0] - kr[0], dy = r[1] - kr[1], d = hyp(dx, dy);
          if (d < m) r = d > 1e-6 ? [kr[0] + dx / d * m, kr[1] + dy / d * m] : [kr[0] + m, kr[1]];
        }
      }
      return null;
    }

    defaultPlace(p, prefX) {
      const side = this.sides[p];
      const cx = prefX == null ? MID : prefX;
      for (const ry of [945, 925, 965, 905, PLACE.yMax, PLACE.yMin]) {
        for (let d = 0; d < 740; d += 3) {
          for (const rx of d ? [cx - d, cx + d] : [cx]) {
            if (rx < PLACE.xMin || rx > PLACE.xMax) continue;
            const a = flip(side, rx, ry);
            if (this.canPlace(p, a[0], a[1])) return a;
          }
        }
      }
      return null;
    }

    // 3.32: the cue lies over the player's own cushion, clear of its inner corners,
    // so the stroke points away from the player.
    canAim(p, x, y, dx, dy) {
      const side = this.sides[p], r = flip(side, x, y), d = flipDir(side, dx, dy);
      if (d[1] >= 0) return false;
      const xh = r[0] - d[0] * (C.FIELD - r[1]) / -d[1];
      return xh > C.CUE_MARGIN && xh < C.FIELD - C.CUE_MARGIN;
    }

    isFree(x, y, ignore) {
      const r = C.PUCK_R;
      if (x < r || x > C.FIELD - r || y < r || y > C.FIELD - r) return false;
      for (const [px, py] of POCKETS) if (hyp(x - px, y - py) < C.POCKET_R + 2) return false;
      for (const k of this.pucks) {
        if (k.on && k.id !== ignore && (k.x - x) * (k.x - x) + (k.y - y) * (k.y - y) < 4 * r * r - 1e-6) return false;
      }
      return true;
    }

    freeSpot(x, y, ignore) {
      if (this.isFree(x, y, ignore)) return [x, y];
      for (let rad = 1; rad < 1000; rad += 1) {
        const steps = Math.max(8, Math.ceil(2 * Math.PI * rad / 2));
        for (let i = 0; i < steps; i++) {
          const a = 2 * Math.PI * i / steps, px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
          if (this.isFree(px, py, ignore)) return [px, py];
        }
      }
      return [x, y];
    }

    // 3.20: a puck that left the table goes to the centre of the circle; if taken, to where
    // the cross line on the side it fell meets the circle; then the other three such points;
    // then halfway between the centre and those points.
    offSpot(wall) {
      const d = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[wall];
      const dirs = [d, [d[1], -d[0]], [-d[1], d[0]], [-d[0], -d[1]]];
      const rr = C.CIRCLE_R - HALF_LINE - C.PUCK_R;
      const cands = [[MID, MID]]
        .concat(dirs.map(v => [MID + v[0] * rr, MID + v[1] * rr]))
        .concat(dirs.map(v => [MID + v[0] * rr / 2, MID + v[1] * rr / 2]));
      for (const c of cands) if (this.isFree(c[0], c[1])) return c;
      return this.freeSpot(MID, MID);
    }

    // 7.3: penalty puck on the edge-zone midline, tight against the cushion on the
    // opponent's side; if taken, as close to the midline as possible. Ties go to the side
    // with fewer of the penalised player's pucks, then fewer pucks in total, then the side
    // the shot was taken from.
    penaltySpot(p, shotX) {
      const side = this.sides[p], R = C.PUCK_R;
      const at = rx => { const a = flip(side, rx, R); return this.isFree(a[0], a[1]) ? a : null; };
      for (let d = 0; d <= MID - R; d += 0.5) {
        const left = at(MID - d), right = d ? at(MID + d) : null;
        if (left && right) {
          const count = own => {
            let l = 0, r = 0;
            for (const k of this.pucks) {
              if (!k.on || (own && k.owner !== p)) continue;
              const rx = flip(side, k.x, k.y)[0];
              if (rx < MID) l++; else if (rx > MID) r++;
            }
            return [l, r];
          };
          const mine = count(true), all = count(false);
          if (mine[0] !== mine[1]) return mine[0] < mine[1] ? left : right;
          if (all[0] !== all[1]) return all[0] < all[1] ? left : right;
          return shotX != null && shotX > MID ? right : left;
        }
        if (left || right) return left || right;
      }
      const a = flip(side, MID, R);
      return this.freeSpot(a[0], a[1]);
    }

    placePenalties(p, n, shotX, marks) {
      let placed = 0;
      for (const k of this.pucks) {
        if (placed >= n) break;
        if (k.owner !== p || k.on) continue;
        const s = this.penaltySpot(p, shotX);
        k.x = s[0]; k.y = s[1]; k.on = true;
        placed++;
        if (marks) marks.push({ id: k.id, kind: 'penalty' });
      }
      return placed;
    }

    // Debt pucks (2.15, 7.4–7.6) are placed as soon as pocketed pucks are available.
    placeDebt(p, shotX, marks) {
      const n = this.placePenalties(p, this.debt[p], shotX, marks);
      this.debt[p] -= n;
      return n;
    }

    passTurn() {
      this.turn = 1 - this.turn;
      this.series[this.turn]++;
    }

    shoot(x, y, vx, vy) {
      const p = this.turn, q = 1 - p, sides = this.sides;
      const pucks = new Map();
      for (const k of this.pucks) {
        if (!k.on) continue;
        pucks.set(k.id, {
          x: k.x, y: k.y, owner: k.owner,
          dark: this.isDark(k),
          myArea: area(sides[p], k.x, k.y, C.PUCK_HOLE_R),
          oppArea: area(sides[q], k.x, k.y, C.PUCK_HOLE_R)
        });
      }
      this.pre = {
        pucks,
        light: [this.hasLight(0), this.hasLight(1)],
        dark: this.hasDark(p),
        on: [this.onTable(0), this.onTable(1)],
        shotX: flip(sides[p], x, y)[0]
      };
      return new Sim(this.pucks.filter(k => k.on), { x, y, vx, vy }, sides[p]);
    }

    // Judge a finished shot and update the position. Returns what happened, with message
    // codes for the interface.
    resolve(sim) {
      const p = this.turn, q = 1 - p, side = this.sides[p], pre = this.pre, P = pre.pucks, log = sim.log;
      const out = { shooter: p, msgs: [], marks: [], keep: false, penalty: false, correct: false, setResult: null, ownPot: 0, oppPot: 0 };
      const msg = (k, extra) => out.msgs.push(Object.assign({ k }, extra || {}));
      const own = id => P.get(id).owner === p;
      const far = side === 'S' ? 'N' : 'S';
      const farBefore = log.cushionsBefore.indexOf(far) >= 0;
      const rebound = farBefore || log.cushionsBefore.indexOf('W') >= 0 || log.cushionsBefore.indexOf('E') >= 0;
      const fc = log.firstContact;
      const light = pre.light[p];

      // Was it a correct stroke (2.8, 4.1–4.3)?
      let reason = null, zoneHit = [];
      if (!fc) {
        if (!light && farBefore) out.correct = true;              // 2.8.4, 4.4
        else reason = light ? 'noContact' : 'onlyDark';             // 2.8 not met / 7.1.6
      } else {
        const hitsOpp = fc.some(id => !own(id));
        if (!rebound) {
          // 3.10, 4.1: a direct stroke may not first touch any piece in the own edge zone
          // or an own dark puck in the centre circle.
          zoneHit = fc.filter(id => P.get(id).myArea === 'strip' || (own(id) && P.get(id).dark));
          if (hitsOpp) reason = 'oppFirst';                          // 7.1.2
          else if (zoneHit.length) reason = 'darkDirect';            // 7.1.8
          else out.correct = true;                                   // 2.8.3
        } else if (light) {
          if (hitsOpp) reason = 'oppFirstRebound';                   // 7.1.3
          else out.correct = true;                                   // 4.2, 4.3.1
        } else if (farBefore || (!hitsOpp && fc.every(id => P.get(id).myArea === 'circle'))) {
          out.correct = true;                                        // 2.8.4, 2.8.5, 4.2
        } else reason = 'onlyDark';                                  // 7.1.6
      }

      const fin = new Map();
      for (const b of sim.bodies) if (!b.striker) fin.set(b.id, b);
      const offIds = new Set(log.off.map(o => o.id));
      const moved = id => {
        const b = fin.get(id), s = P.get(id);
        return !b.on || hyp(b.x - s.x, b.y - s.y) > 0.5;
      };

      let lost = null;
      // 8.1.4: direct first contact in the own dark area, and other pieces moved too.
      if (zoneHit.length) {
        for (const id of fin.keys()) if (fc.indexOf(id) < 0 && moved(id)) { lost = '814'; break; }
      }

      const restore = new Set();
      if (!out.correct && !lost) {
        // 7.1.8: the piece moved by the forbidden direct contact goes back.
        for (const id of zoneHit) if (moved(id)) restore.add(id);
        // 4.8, 7.1.11, 8.1.1: own pucks knocked out of the own dark area.
        const knocked = [];
        for (const [id, b] of fin) {
          if (own(id) && P.get(id).dark && moved(id) && (!b.on || area(side, b.x, b.y, C.PUCK_HOLE_R) === null)) knocked.push(id);
        }
        if (knocked.length >= 2) lost = '811';
        else for (const id of knocked) restore.add(id);
        // 4.6, 4.8, 7.1.11: opponent pucks knocked off the table or driven into the
        // opponent's dark area are restored — unless they only moved within the band, or
        // from the centre circle into the band. Pocketed ones stay pocketed (4.9).
        for (const [id, b] of fin) {
          if (own(id) || !moved(id)) continue;
          if (offIds.has(id)) { restore.add(id); continue; }
          if (!b.on) continue;
          const a0 = P.get(id).oppArea, a1 = area(this.sides[q], b.x, b.y, C.PUCK_HOLE_R);
          if (a1 && !(a1 === 'strip' && a0) && !(a1 === 'circle' && a0 === 'circle')) restore.add(id);
        }
      }

      out.penalty = !out.correct || log.strikerPocketed || log.strikerOff;
      if (reason) msg('pen_' + reason);
      if (log.strikerPocketed) msg('pen_strikerPocket');                // 7.1.4
      if (log.strikerOff) msg('pen_strikerOff');                        // 7.1.5

      // Bring the table up to date.
      for (const k of this.pucks) {
        const b = fin.get(k.id);
        if (!b) continue;
        if (!b.on) k.on = false; else { k.x = b.x; k.y = b.y; }
      }
      if (!lost) {
        for (const id of restore) {
          const k = this.pucks[id], s = P.get(id);
          k.on = false;
          const xy = this.freeSpot(s.x, s.y);
          k.x = xy[0]; k.y = xy[1]; k.on = true;
          out.marks.push({ id, kind: 'restore' });
        }
        for (const o of log.off) {
          if (restore.has(o.id)) continue;
          const k = this.pucks[o.id], xy = this.offSpot(o.wall);
          k.x = xy[0]; k.y = xy[1]; k.on = true;
          out.marks.push({ id: o.id, kind: 'off' });
        }
        if (restore.size) msg('restored', { n: restore.size });
      }

      const pot = log.pocketed.filter(id => !restore.has(id));
      out.ownPot = pot.filter(own).length;
      out.oppPot = pot.length - out.ownPot;
      const offLeft = log.off.filter(o => !restore.has(o.id)).length;
      const returned = log.strikerReturned && !pre.dark;               // 3.15, 6.1.5
      out.keep = !out.penalty && !lost && out.ownPot > 0 && out.oppPot === 0 && offLeft === 0 && !returned;

      if (out.ownPot) msg('pocketed', { n: out.ownPot });
      if (out.oppPot) msg('oppPocketed', { n: out.oppPot });           // 6.1.2
      if (offLeft) msg('off', { n: offLeft });                         // 3.20, 6.1.3
      if (returned) msg('returned');
      if (!out.penalty && !lost && !out.ownPot) msg('noOwn');          // 6.1.1

      if (lost) {
        msg('lost_' + lost);
        out.setResult = { winner: q, k: 'lost_' + lost };
        return out;
      }

      const ownOn = this.onTable(p), oppOn = this.onTable(q), ownB = pre.on[p], oppB = pre.on[q];
      if (ownB && !ownOn && oppB && !oppOn) {
        // 12.5: both last pucks in one stroke: replay, or a lost set if it earned a penalty.
        out.setResult = out.penalty ? { winner: q, k: 'lost_bothLast' } : { replay: true, swap: false, k: 'replay_bothLast' };
      } else if (ownB && !ownOn && (out.keep || this.firstClear === q || (!out.penalty && !this.debt[p]))) {
        // A penalty, or a debt owed, on the clearing shot puts pucks back (7.5) and play
        // goes on below; only the 12.4 reply loses the set for it.
        if (!out.keep && this.firstClear === q) {
          out.setResult = { winner: q, k: 'lost_lastFoul' };            // 12.4
        } else if (this.debt[p]) {
          const n = this.placeDebt(p, pre.shotX, out.marks);            // 7.5
          msg('debtPlaced', { n });
        } else if (p === this.first && this.series[p] === 1 && this.series[q] === 0) {
          this.firstClear = p;                                         // 12.4
          msg('firstClear');
          this.passTurn();
        } else if (this.firstClear === q) {
          out.setResult = { replay: true, swap: true, k: 'replay_bothClear' };  // 12.4
        } else {
          out.setResult = { winner: p, k: 'win' };                     // 12.3
        }
      } else if (oppB && !oppOn && !this.debt[q]) {
        out.setResult = { winner: q, k: 'win_oppLast' };
      } else {
        if (oppB && !oppOn) msg('debtPlacedOpp', { n: this.placeDebt(q, null, out.marks) });
        if (!out.keep) {
          if (this.firstClear === q) {
            out.setResult = { winner: q, k: 'win_firstClear' };        // 12.4
          } else {
            const owed = (out.penalty ? 1 : 0) + this.debt[p];
            const n = this.placePenalties(p, owed, pre.shotX, out.marks);
            this.debt[p] = owed - n;
            if (out.penalty) msg(n ? 'penaltyPlaced' : 'debt');        // 7.3, 7.4
            else if (n) msg('debtPlaced', { n });
            this.passTurn();
          }
        }
      }

      // 12.6: both players down to dark pucks and each missing three times.
      if (!out.setResult) {
        if (!pre.light[0] && !pre.light[1]) {
          this.miss[p] = fc ? 0 : this.miss[p] + 1;
          if (this.miss[0] >= 3 && this.miss[1] >= 3) out.setResult = { replay: true, swap: false, k: 'replay_stuck' };
        } else this.miss = [0, 0];
      }
      return out;
    }

    // After a set ends: count it, or set up the replay.
    nextSet(res) {
      if (res.replay) {
        if (res.swap) { this.sides.reverse(); this.newSet(1 - this.first); } else this.newSet(this.first);
        return;
      }
      this.sets[res.winner]++;
      if (this.sets[res.winner] >= this.setsToWin) { this.winner = res.winner; return; }
      this.setNo++;
      this.sides.reverse();                                            // 12.2
      this.newSet(this.setNo % 2 ? this.matchFirst : 1 - this.matchFirst);
    }
  }

  // Log entries for one judged shot: message codes, rendered (and translated) by the
  // interface. The server builds the same entries for online matches.
  function logEntries(out, setNo) {
    const list = [];
    for (const m of out.msgs) {
      if (m.k.indexOf('lost_') === 0) continue;   // reported with the set result
      const e = { k: m.k, who: out.shooter, set: setNo };
      if (m.n != null) e.n = m.n;
      list.push(e);
    }
    if (out.setResult) list.push({ k: 'set', res: out.setResult, shooter: out.shooter, set: setNo });
    return list;
  }

  /* --------------------------------------------------------- computer player */

  const LEVELS = {
    easy:   { ang: 1.6, pow: 0.08, sims: 50, robust: 0 },
    medium: { ang: 1.1, pow: 0.06, sims: 130, robust: 3 },
    hard:   { ang: 0.2, pow: 0.015, sims: 240, robust: 4 }
  };

  function gauss(rng) {
    let u = 0;
    while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  }

  function nearestPocket(x, y) {
    let m = Infinity;
    for (const [px, py] of POCKETS) m = Math.min(m, hyp(x - px, y - py));
    return m;
  }

  function scoreOutcome(g, o, p) {
    let s = 0;
    if (o.setResult) {
      if (!o.setResult.replay) s += o.setResult.winner === p ? 1e6 : -1e6;
    }
    s += 1000 * o.ownPot - 900 * o.oppPot;
    if (o.penalty) s -= 2500;
    if (o.keep) s += 1500;
    for (const k of g.pucks) {
      if (!k.on || g.isDark(k)) continue;
      const near = Math.max(0, 1 - nearestPocket(k.x, k.y) / 700);
      s += k.owner === p ? 40 * near : -30 * near;
    }
    return s;
  }

  // Generator: yields now and then so a caller can spread the search over frames.
  // Returns { x, y, vx, vy } in absolute coordinates.
  function* planShot(game, level, rng) {
    rng = rng || Math.random;
    const L = LEVELS[level] || LEVELS.medium;
    const p = game.turn, side = game.sides[p];
    const R = C.STRIKER_R + C.PUCK_R;
    const pieces = game.pucks.filter(k => k.on).map(k => {
      const r = flip(side, k.x, k.y);
      return { k, x: r[0], y: r[1] };
    });
    const pockets = POCKETS.map(xy => flip(side, xy[0], xy[1]));

    const places = [];
    for (const ry of [880, 905, 930, 955, PLACE.yMax]) {
      for (let rx = PLACE.xMin; rx <= PLACE.xMax; rx += 20) {
        const a = flip(side, rx, ry);
        if (game.canPlace(p, a[0], a[1])) places.push([rx, ry]);
      }
    }
    if (!places.length) {
      const a = game.defaultPlace(p) || flip(side, MID, 945);
      const d = flipDir(side, 0, -1);
      return { x: a[0], y: a[1], vx: d[0] * 1500, vy: d[1] * 1500 };
    }

    // Aimed shots: each own light puck towards each pocket.
    const aimed = [];
    for (const t of pieces) {
      if (t.k.owner !== p || game.isDark(t.k)) continue;
      for (const [px, py] of pockets) {
        const tx = px - t.x, ty = py - t.y, td = hyp(tx, ty), ux = tx / td, uy = ty / td;
        const gx = t.x - ux * R, gy = t.y - uy * R;
        const blocked = pieces.some(o => o !== t && segDist(t.x, t.y, px, py, o.x, o.y) < 2 * C.PUCK_R - 0.5);
        for (const [sx, sy] of places) {
          const dx = gx - sx, dy = gy - sy, dd = hyp(dx, dy);
          if (dy >= 0) continue;
          const vx = dx / dd, vy = dy / dd, cut = vx * ux + vy * uy;
          if (cut < 0.35) continue;
          if (pieces.some(o => o !== t && segDist(sx, sy, gx, gy, o.x, o.y) < R)) continue;
          const a = C.DECEL * 1.3;
          const vp = Math.sqrt(350 * 350 + 2 * a * Math.max(0, td - 35));
          const vsi = vp / (cut * (1 + C.E_PUCK) * C.STRIKER_M / (C.STRIKER_M + C.PUCK_M));
          const speed = Math.sqrt(vsi * vsi + 2 * a * dd);
          aimed.push({ rx: sx, ry: sy, dx: vx, dy: vy, speed, h: 2 * cut - dd / 1500 - td / 1500 - (blocked ? 1.5 : 0) });
        }
      }
    }
    aimed.sort((a, b) => b.h - a.h);

    const cands = [];
    const nAimed = Math.floor(L.sims * 0.7 / 3);
    for (let i = 0, used = 0; i < aimed.length && used < nAimed; i++) {
      const c = aimed[i];
      if (cands.some(o => Math.abs(o.rx - c.rx) < 15 && Math.abs(o.ry - c.ry) < 15 && o.dx * c.dx + o.dy * c.dy > 0.9995)) continue;
      used++;
      for (const m of [0.9, 1.15, 1.45]) cands.push({ rx: c.rx, ry: c.ry, dx: c.dx, dy: c.dy, speed: c.speed * m });
    }
    while (cands.length < L.sims) {
      const pl = places[Math.floor(rng() * places.length)];
      const ang = (rng() * 2 - 1) * 1.25;
      cands.push({ rx: pl[0], ry: pl[1], dx: Math.sin(ang), dy: -Math.cos(ang), speed: 500 + rng() * 4300 });
    }

    const evaluate = c => {
      const g = game.clone();
      const a = flip(side, c.rx, c.ry), d = flipDir(side, c.dx, c.dy);
      if (!g.canPlace(p, a[0], a[1]) || !g.canAim(p, a[0], a[1], d[0], d[1])) return -Infinity;
      const v = Math.max(C.MIN_SPEED, Math.min(C.MAX_SPEED, c.speed));
      const sim = g.shoot(a[0], a[1], d[0] * v, d[1] * v);
      sim.run();
      return scoreOutcome(g, g.resolve(sim), p);
    };
    const jitter = (c, s) => {
      const ang = gauss(rng) * L.ang * Math.PI / 180 * s, cs = Math.cos(ang), sn = Math.sin(ang);
      return { rx: c.rx, ry: c.ry, dx: c.dx * cs - c.dy * sn, dy: c.dx * sn + c.dy * cs, speed: c.speed * (1 + gauss(rng) * L.pow * s) };
    };

    for (let i = 0; i < cands.length; i++) {
      cands[i].score = evaluate(cands[i]);
      if (i % 3 === 2) yield;
    }
    cands.sort((a, b) => b.score - a.score);

    let best = cands[0];
    if (L.robust) {
      let bestMean = -Infinity;
      for (const c of cands.slice(0, 6)) {
        if (c.score === -Infinity) continue;
        let sum = c.score;
        for (let k = 0; k < L.robust; k++) { sum += evaluate(jitter(c, 1)); yield; }
        const mean = sum / (L.robust + 1);
        if (mean > bestMean) { bestMean = mean; best = c; }
      }
    }

    // Execute with the level's hand error; fall back to the exact shot if that is illegal.
    let shot = jitter(best, 1);
    const a = flip(side, shot.rx, shot.ry);
    let d = flipDir(side, shot.dx, shot.dy);
    if (!game.canAim(p, a[0], a[1], d[0], d[1])) { shot = best; d = flipDir(side, best.dx, best.dy); }
    const v = Math.max(C.MIN_SPEED, Math.min(C.MAX_SPEED, shot.speed));
    return { x: a[0], y: a[1], vx: d[0] * v, vy: d[1] * v };
  }

  function planShotSync(game, level, rng) {
    const it = planShot(game, level, rng);
    let r;
    do { r = it.next(); } while (!r.done);
    return r.value;
  }

  const api = { C, POCKETS, PLACE, ZONE_LINE, Sim, Game, flip, flipDir, area, powerToSpeed, speedToPower, planShot, planShotSync, LEVELS, logEntries };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Novuss = api;
})(this);
