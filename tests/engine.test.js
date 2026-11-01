// Run with: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../public/game.js');
const { C, Game } = N;

// A finished "simulation" built by hand: final positions plus the striker's contact log.
function fakeSim(game, changes, log) {
  const bodies = [{ striker: true, id: -1, x: 500, y: 500, on: true }];
  for (const k of game.pucks) {
    if (!k.on) continue;
    const ch = changes[k.id] || {};
    bodies.push({ striker: false, id: k.id, owner: k.owner, x: ch.x ?? k.x, y: ch.y ?? k.y, on: ch.on ?? true });
  }
  return {
    bodies,
    log: Object.assign({
      cushionsBefore: [], firstContact: null, pocketed: [], off: [],
      strikerPocketed: false, strikerOff: false, strikerLeft: true, strikerReturned: false
    }, log)
  };
}

// Shoot from the default spot and judge a hand-made outcome.
function play(game, changes, log) {
  const s = game.defaultPlace(game.turn);
  game.shoot(s[0], s[1], 0, -1000);
  const pot = Object.keys(changes).filter(id => changes[id].on === false).map(Number);
  return game.resolve(fakeSim(game, changes, Object.assign({ pocketed: pot.filter(id => !(log.off || []).some(o => o.id === id)) }, log)));
}

// Empty table except the listed pucks: { id: [x, y] }.
function position(game, layout) {
  for (const k of game.pucks) {
    const xy = layout[k.id];
    k.on = !!xy;
    if (xy) { k.x = xy[0]; k.y = xy[1]; }
  }
}

const keys = out => out.msgs.map(m => m.k);

test('initial position follows 1.2', () => {
  const g = new Game();
  assert.equal(g.pucks.length, 16);
  for (const k of g.pucks) {
    // Player 0 sits at S, so their pucks lie along the N cushion, and vice versa.
    assert.equal(k.y, k.owner === 0 ? C.PUCK_R : C.FIELD - C.PUCK_R);
  }
  const row = g.pucks.filter(k => k.owner === 0).map(k => k.x).sort((a, b) => a - b);
  assert.equal(row.filter(x => x < 500).length, 4);
  for (let i = 1; i < 8; i++) assert.equal(row[i] - row[i - 1], 2 * C.PUCK_R);
});

test('striker placement and aiming limits', () => {
  const g = new Game();
  const d = g.defaultPlace(0);
  assert.ok(g.canPlace(0, d[0], d[1]));
  assert.ok(!g.canPlace(0, 500, 860), 'hole on the zone line');
  assert.ok(!g.canPlace(0, 132, 940), 'hole over the side line');
  assert.ok(!g.canPlace(0, 500, 985), 'overlapping a puck on the cushion');
  assert.ok(g.canPlace(1, 1000 - d[0], 1000 - d[1]), 'mirrored for the N player');
  assert.ok(g.canAim(0, 500, 940, 0, -1));
  assert.ok(!g.canAim(0, 500, 940, 0, 1), 'backwards');
  assert.ok(!g.canAim(0, 800, 940, -0.999, -0.04), 'cue would cover the corner');
  assert.ok(g.canAim(1, 500, 60, 0, 1));
});

test('pocketing an own puck keeps the turn (3.16)', () => {
  const g = new Game();
  const out = play(g, { 3: { on: false } }, { firstContact: [3] });
  assert.ok(out.correct && out.keep && !out.penalty);
  assert.equal(g.turn, 0);
  assert.equal(g.onTable(0), 7);
});

test('no own puck pocketed passes the turn (6.1.1)', () => {
  const g = new Game();
  const out = play(g, { 3: { x: 400, y: 300 } }, { firstContact: [3] });
  assert.ok(out.correct && !out.keep && !out.penalty);
  assert.equal(g.turn, 1);
  assert.equal(g.series[1], 1);
});

test('hitting an opponent puck first is a penalty (7.1.2); all eight on table makes a debt (7.4)', () => {
  const g = new Game();
  position(g, { 0: [100, 300], 8: [500, 600] });
  g.pucks.filter(k => k.owner === 0 && k.id).forEach(k => { k.on = false; });
  // Player 0 has one puck on the table and seven pocketed.
  let out = play(g, { 8: { x: 500, y: 400 } }, { firstContact: [8] });
  assert.ok(out.penalty);
  assert.ok(keys(out).includes('pen_oppFirst'));
  assert.equal(g.onTable(0), 2, 'penalty puck placed');
  const placed = g.pucks.find(k => k.owner === 0 && k.on && k.id !== 0);
  assert.deepEqual([placed.x, placed.y], [500, C.PUCK_R], '7.3: midline at the opponent cushion');

  const g2 = new Game();
  out = play(g2, {}, {});
  assert.ok(keys(out).includes('pen_noContact'));
  assert.equal(g2.debt[0], 1);
  assert.equal(g2.onTable(0), 8);
});

test('debt puck is placed once a puck has been pocketed and the turn ends (7.5)', () => {
  const g = new Game();
  g.debt[0] = 1;
  play(g, { 2: { on: false } }, { firstContact: [2] });      // keep: debt waits
  assert.equal(g.onTable(0), 7);
  assert.equal(g.debt[0], 1);
  play(g, { 3: { x: 450, y: 300 } }, { firstContact: [3] });  // turn ends
  assert.equal(g.onTable(0), 8);
  assert.equal(g.debt[0], 0);
});

test('penalty spot moves aside when the midline is taken (7.3)', () => {
  const g = new Game();
  position(g, { 0: [300, 300], 1: [500, 15], 2: [700, 400] });
  const s = g.penaltySpot(0, 600);
  assert.equal(s[1], 15);
  assert.equal(Math.abs(s[0] - 500), 30);
  // Equal distance both ways: one own puck each side, totals equal, shot from the right.
  assert.equal(s[0], 530);
});

test('direct hit on an own dark puck: penalty and restore (7.1.8), set lost if more moved (8.1.4)', () => {
  const g = new Game();
  position(g, { 0: [300, 950], 1: [400, 300], 8: [600, 300] });
  let out = play(g, { 0: { x: 310, y: 900 } }, { firstContact: [0] });
  assert.ok(out.penalty && keys(out).includes('pen_darkDirect'));
  const k0 = g.pucks[0];
  assert.deepEqual([k0.x, k0.y], [300, 950]);

  const g2 = new Game();
  position(g2, { 0: [300, 950], 1: [400, 300], 8: [600, 300], 9: [320, 920] });
  out = play(g2, { 0: { x: 310, y: 900 }, 9: { x: 330, y: 850 } }, { firstContact: [0] });
  assert.deepEqual(out.setResult, { winner: 1, k: 'lost_814' });
});

test('opponent puck in the own edge zone cannot be the first target (3.10)', () => {
  const g = new Game();
  // Initially player 1's row lies in player 0's edge zone.
  const start = [g.pucks[11].x, g.pucks[11].y];
  const out = play(g, { 11: { x: 560, y: 960 } }, { firstContact: [11] });
  assert.ok(out.penalty);
  assert.deepEqual([g.pucks[11].x, g.pucks[11].y], start, 'restored (7.1.8)');
});

test('only dark pucks: far-cushion rebound is correct (2.8.4, 4.4); side-only rebound must reach the circle (7.1.6, 2.8.5)', () => {
  let g = new Game();
  position(g, { 0: [300, 950], 1: [500, 520], 8: [600, 300] });
  let out = play(g, {}, { cushionsBefore: ['N'] });
  assert.ok(out.correct && !out.penalty);
  assert.equal(g.turn, 1);

  g = new Game();
  position(g, { 0: [300, 950], 1: [500, 520], 8: [600, 300] });
  out = play(g, { 0: { x: 320, y: 930 } }, { cushionsBefore: ['W'], firstContact: [0] });
  assert.ok(out.penalty && keys(out).includes('pen_onlyDark'));

  g = new Game();
  position(g, { 0: [300, 950], 1: [500, 520], 8: [600, 300] });
  out = play(g, { 1: { on: false } }, { cushionsBefore: ['E'], firstContact: [1] });
  assert.ok(out.correct && out.keep);
});

test('rebound may play own dark pucks while light ones exist (4.2, 4.3.1)', () => {
  const g = new Game();
  position(g, { 0: [300, 950], 1: [400, 300], 8: [600, 300] });
  const out = play(g, { 0: { on: false } }, { cushionsBefore: ['N'], firstContact: [0] });
  assert.ok(out.correct && out.keep);
});

test('rebound hitting an opponent puck first while light pucks remain is a penalty (7.1.3)', () => {
  const g = new Game();
  position(g, { 0: [300, 300], 8: [600, 300] });
  const out = play(g, {}, { cushionsBefore: ['W'], firstContact: [8] });
  assert.ok(keys(out).includes('pen_oppFirstRebound'));
});

test('striker in a pocket after pocketing a puck: penalty, puck stays pocketed (7.1.4)', () => {
  const g = new Game();
  const out = play(g, { 4: { on: false } }, { firstContact: [4], strikerPocketed: true });
  assert.ok(out.correct && out.penalty && !out.keep);
  assert.equal(g.turn, 1);
  assert.equal(g.onTable(0), 8, 'the pocketed puck comes back as the penalty puck');
});

test('opponent puck pocketed with an own one passes the turn (6.1.2)', () => {
  const g = new Game();
  const out = play(g, { 4: { on: false }, 12: { on: false } }, { firstContact: [4] });
  assert.ok(out.correct && !out.keep && !out.penalty);
  assert.equal(g.onTable(1), 7);
});

test('striker sliding back into the own zone passes the turn (3.15, 6.1.5)', () => {
  const g = new Game();
  const out = play(g, { 4: { on: false } }, { firstContact: [4], strikerReturned: true });
  assert.ok(!out.keep && !out.penalty);
  assert.ok(keys(out).includes('returned'));
});

test('a puck over the cushion goes to the centre circle (3.20) and passes the turn (6.1.3)', () => {
  const g = new Game();
  const out = play(g, { 4: { on: false } }, { firstContact: [4], off: [{ id: 4, wall: 'N' }] });
  assert.ok(!out.keep);
  assert.deepEqual([g.pucks[4].x, g.pucks[4].y], [500, 500]);
  assert.ok(g.pucks[4].on);
});

test('penalised shot driving an opponent puck into their dark band restores it (4.6)', () => {
  const g = new Game();
  position(g, { 0: [300, 300], 8: [600, 300] });
  // Player 1 sits at N, so their dark band is y < 130.
  play(g, { 8: { x: 600, y: 60 } }, { firstContact: [8] });
  assert.deepEqual([g.pucks[8].x, g.pucks[8].y], [600, 300]);
});

test('clearing all eight in the first series gives the opponent one series (12.4)', () => {
  let g = new Game();
  position(g, { 0: [300, 300], 8: [600, 300], 9: [650, 300] });
  let out = play(g, { 0: { on: false } }, { firstContact: [0] });
  assert.equal(g.firstClear, 0);
  assert.equal(g.turn, 1);
  assert.ok(!out.setResult);
  out = play(g, { 8: { x: 600, y: 400 } }, { firstContact: [8] });
  assert.deepEqual(out.setResult, { winner: 0, k: 'win_firstClear' });

  g = new Game();
  position(g, { 0: [300, 300], 8: [600, 300] });
  play(g, { 0: { on: false } }, { firstContact: [0] });
  out = play(g, { 8: { on: false } }, { firstContact: [8] });
  assert.deepEqual(out.setResult, { replay: true, swap: true, k: 'replay_bothClear' });
  g.nextSet(out.setResult);
  assert.deepEqual(g.sides, ['N', 'S']);
  assert.equal(g.first, 1);
  assert.deepEqual(g.sets, [0, 0]);
});

test('later clear wins the set (12.3), even when the shot loses the turn', () => {
  let g = new Game();
  g.series = [2, 1];
  position(g, { 0: [300, 300], 8: [600, 300] });
  let out = play(g, { 0: { on: false } }, { firstContact: [0] });
  assert.deepEqual(out.setResult, { winner: 0, k: 'win' });

  g = new Game();
  g.series = [2, 1];
  position(g, { 0: [300, 300], 8: [600, 300], 9: [700, 300] });
  out = play(g, { 0: { on: false }, 9: { on: false } }, { firstContact: [0] });
  assert.deepEqual(out.setResult, { winner: 0, k: 'win' });
});

test('clearing with a penalty puts a penalty puck out and passes the turn (7.5)', () => {
  const g = new Game();
  g.series = [2, 1];
  position(g, { 0: [300, 300], 8: [600, 300] });
  const out = play(g, { 0: { on: false } }, { firstContact: [0], strikerPocketed: true });
  assert.ok(!out.setResult);
  assert.equal(g.onTable(0), 1);
  assert.equal(g.turn, 1);
});

test('the 12.4 reply loses the set if the clearing shot loses the turn', () => {
  const g = new Game();
  position(g, { 0: [300, 300], 8: [600, 300] });
  play(g, { 0: { on: false } }, { firstContact: [0] });
  const out = play(g, { 8: { on: false } }, { firstContact: [8], strikerPocketed: true });
  assert.deepEqual(out.setResult, { winner: 0, k: 'lost_lastFoul' });
});

test('clearing in the first series with a penalty is no 12.4 clear', () => {
  const g = new Game();
  position(g, { 0: [300, 300], 8: [600, 300] });
  const out = play(g, { 0: { on: false } }, { firstContact: [0], strikerPocketed: true });
  assert.ok(!out.setResult);
  assert.equal(g.firstClear, null);
  assert.equal(g.onTable(0), 1);
  assert.equal(g.turn, 1);
});

test('both last pucks in one correct stroke: replay without changes (12.5)', () => {
  const g = new Game();
  g.series = [2, 1];
  position(g, { 0: [300, 300], 8: [600, 300] });
  const out = play(g, { 0: { on: false }, 8: { on: false } }, { firstContact: [0] });
  assert.deepEqual(out.setResult, { replay: true, swap: false, k: 'replay_bothLast' });
});

test('pocketing the opponent\'s last puck hands them the set', () => {
  const g = new Game();
  g.series = [2, 1];
  position(g, { 0: [300, 300], 1: [350, 300], 8: [600, 300] });
  const out = play(g, { 8: { on: false } }, { firstContact: [0] });
  assert.deepEqual(out.setResult, { winner: 1, k: 'win_oppLast' });
});

test('sets alternate the first shot and swap sides (12.2)', () => {
  const g = new Game({ setsToWin: 2, first: 1 });
  assert.equal(g.turn, 1);
  g.nextSet({ winner: 1 });
  assert.deepEqual(g.sets, [0, 1]);
  assert.deepEqual(g.sides, ['N', 'S']);
  assert.equal(g.turn, 0);
  g.nextSet({ winner: 1 });
  assert.equal(g.winner, 1);
});

test('a JSON snapshot is independent of later play, and replays to the same result', () => {
  const g = new Game({ first: 0 });
  const s = g.defaultPlace(0);
  const before = g.toJSON();
  const frozen = JSON.stringify(before);
  const sim = g.shoot(s[0], s[1], 300, -3500);
  sim.run();
  const out = g.resolve(sim);
  if (out.setResult) g.nextSet(out.setResult);
  assert.equal(JSON.stringify(before), frozen, 'snapshot unchanged by the shot');
  // The browser replays from the snapshot and must reach the same physics result.
  const replay = Game.fromJSON(before).shoot(s[0], s[1], 300, -3500);
  while (!replay.atRest()) replay.advance(1 / 60);
  for (let i = 0; i < sim.bodies.length; i++) {
    assert.equal(replay.bodies[i].x, sim.bodies[i].x);
    assert.equal(replay.bodies[i].y, sim.bodies[i].y);
  }
});

/* ---------------------------------------------------------------- physics */

test('physics: head-on hit transfers momentum, nothing tunnels', () => {
  const sim = new N.Sim([{ id: 0, owner: 0, x: 500, y: 400 }], { x: 500, y: 700, vx: 0, vy: -3000 }, 'S');
  const [striker, puck] = sim.bodies;
  let before = 0;
  while (!sim.log.firstContact) { before = striker.vy; sim.step(C.DT); }
  assert.deepEqual(sim.log.firstContact, [0]);
  // Elastic-ish impact of a 22 g striker on a 5 g puck: the puck leaves faster, the
  // striker carries on more slowly in the same direction.
  assert.ok(puck.vy < striker.vy && striker.vy < 0);
  const p0 = -C.STRIKER_M * before, p1 = -(C.STRIKER_M * striker.vy + C.PUCK_M * puck.vy);
  assert.ok(Math.abs(p1 - p0) / p0 < 0.01, 'momentum conserved');
  sim.run();
  assert.ok(sim.atRest());
});

test('physics: full-strength strikes stay legal and settle', () => {
  for (const vx of [-1500, 0, 900]) {
    const g = new Game();
    const s = g.defaultPlace(0);
    const sim = g.shoot(s[0], s[1], vx, -4800);
    sim.run();
    assert.ok(sim.atRest());
    const out = g.resolve(sim);
    assert.ok(Array.isArray(out.msgs));
  }
});

function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function checkTable(g) {
  const on = g.pucks.filter(k => k.on);
  for (const k of on) {
    assert.ok(k.x >= C.PUCK_R - 1e-6 && k.x <= C.FIELD - C.PUCK_R + 1e-6 && k.y >= C.PUCK_R - 1e-6 && k.y <= C.FIELD - C.PUCK_R + 1e-6, 'puck inside the field');
    for (const [px, py] of N.POCKETS) assert.ok(Math.hypot(k.x - px, k.y - py) >= C.POCKET_R - 1e-6, 'puck not over a hole');
  }
  for (let i = 0; i < on.length; i++) {
    for (let j = i + 1; j < on.length; j++) {
      assert.ok(Math.hypot(on[i].x - on[j].x, on[i].y - on[j].y) > 2 * C.PUCK_R - 0.5, 'no overlapping pucks');
    }
  }
  assert.ok(g.debt.every(d => d >= 0));
}

for (const [level, seed] of [['easy', 1], ['medium', 7], ['hard', 42]]) {
  test(`computer vs computer plays a full match (${level})`, () => {
    const rng = seeded(seed);
    const g = new Game({ setsToWin: 2, first: 0 });
    const stats = { shots: 0, penalties: 0, sets: 0, replays: 0 };
    while (g.winner === null) {
      assert.ok(stats.shots < 3000, 'match finishes');
      const shot = N.planShotSync(g, level, rng);
      assert.ok(g.canPlace(g.turn, shot.x, shot.y), 'AI places legally');
      assert.ok(g.canAim(g.turn, shot.x, shot.y, shot.vx, shot.vy), 'AI aims legally');
      const sim = g.shoot(shot.x, shot.y, shot.vx, shot.vy);
      sim.run();
      const out = g.resolve(sim);
      stats.shots++;
      if (out.penalty) stats.penalties++;
      checkTable(g);
      if (out.setResult) {
        if (out.setResult.replay) stats.replays++; else stats.sets++;
        g.nextSet(out.setResult);
      }
    }
    console.log(`  ${level}: winner ${g.winner}, sets ${g.sets.join(':')}`, stats);
  });
}
