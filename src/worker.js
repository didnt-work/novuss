/*
 * Novuss online — Cloudflare Worker. Static files come from ./public; every match is a
 * Room Durable Object reached over WebSocket at /ws?room=<id> (or /ws?room=new).
 * The room is authoritative: it checks and simulates every shot with game.js and sends
 * the result to both players, whose browsers replay the same simulation.
 *
 * Statistics go to the Analytics Engine dataset `novuss_events`, one row per event, with
 * the room id as index1, the event name as blob1 and a detail as blob2. No names, chat
 * text or addresses are recorded.
 *   room_created     double1 sets to win
 *   match_started    double1 sets to win, double2 match number in the room (2+ = rematch)
 *   spectator_joined
 *   shot             blob2 keep | pass | penalty; double1 own pucks pocketed, double2 opponent's
 *   set_finished     blob2 result code (win, lost_814, replay_bothClear, …); double1 set number
 *   match_finished   double1/double2 sets won by seat 0/1, double3 seconds, double4 shots
 *   chat
 */
// Messages from the browser: create, peek, join, shot, aim, chat, rematch, sync.
import { DurableObject } from 'cloudflare:workers';
import N from '../public/game.js';
import BUILD from '../public/version.js';

const ROOM_RE = /^[a-z2-9]{10}$/;
const ROOM_TTL = 3 * 24 * 3600 * 1000;   // forget rooms untouched for three days
const NAME_MAX = 20;
const CHAT_MAX = 300;
const CHAT_GAP = 1000;                    // ms between chat messages from one connection
const LOG_KEEP = 10000;                   // log entries kept per room (about 40 bytes each)
const LOG_SEND = 256 * 1024;              // newest log a joining player receives, in bytes
const SOCKETS_MAX = 64;                   // players, spectators and open invitations per room

function randomId(n) {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';   // 32 symbols: no modulo bias
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), b => abc[b % 32]).join('');
}

function cleanName(s) {
  return typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX) : '';
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== '/ws') return new Response('Not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Upgrade required', { status: 426 });
    let room = url.searchParams.get('room');
    if (room === 'new') {
      // New rooms cost storage until they expire, so limit how fast one address makes them.
      const ip = req.headers.get('cf-connecting-ip') || 'unknown';
      if (env.CREATE_LIMIT && !(await env.CREATE_LIMIT.limit({ key: ip })).success) {
        return new Response('Too many new rooms', { status: 429 });
      }
      room = randomId(10);
    }
    if (!ROOM_RE.test(room || '')) return new Response('Bad room', { status: 400 });
    const target = new URL(req.url);
    target.searchParams.set('room', room);
    return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(new Request(target, req));
  }
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.r = null;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
    ctx.blockConcurrencyWhile(async () => {
      this.logTable();
      const stored = await ctx.storage.get('room');
      if (!stored) return;
      const { log, ...r } = stored;
      this.r = { ...r, game: r.game ? N.Game.fromJSON(r.game) : null };
      // Earlier versions kept the log inside the room record.
      if (Array.isArray(log)) {
        this.addLog(log);
        await ctx.storage.put('room', r);
      }
    });
  }

  // The log is one row per entry, so a long match never rewrites it as a whole.
  logTable() {
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, entry TEXT NOT NULL)');
  }

  async fetch(req) {
    const id = new URL(req.url).searchParams.get('room');
    if (this.ctx.getWebSockets().length >= SOCKETS_MAX) return new Response('Room is full', { status: 503 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ id, seat: -1, joined: false, bucket: 40, at: Date.now() });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  /* ------------------------------------------------------------- plumbing */

  sockets(except) {
    return this.ctx.getWebSockets().filter(ws => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  online(except) {
    const n = [0, 0];
    for (const ws of this.sockets(except)) {
      const a = ws.deserializeAttachment();
      if (a.joined && a.seat >= 0) n[a.seat]++;
    }
    return n;
  }

  seatsView(except) {
    const on = this.online(except);
    return this.r.seats.map((s, i) => (s ? { name: s.name, online: on[i] > 0 } : null));
  }

  // The full log goes only to a socket that has just joined; everyone else already has it
  // and receives new entries as they happen.
  stateMsg(withLog) {
    const r = this.r;
    // v: hibernated connections survive a deploy, so every state and shot names the build.
    const msg = { t: 'state', v: BUILD, room: r.id, sets: r.sets, seq: r.seq, match: r.match, guide: !!r.guide, hints: !!r.hints, seats: this.seatsView(), game: r.game ? r.game.toJSON() : null };
    if (withLog) msg.log = this.recentLog();
    return msg;
  }

  addLog(entries) {
    const sql = this.ctx.storage.sql;
    for (const e of entries) sql.exec('INSERT INTO log (entry) VALUES (?)', JSON.stringify(e));
    sql.exec('DELETE FROM log WHERE id <= (SELECT MAX(id) FROM log) - ?', LOG_KEEP);
  }

  // The newest entries that fit in LOG_SEND bytes, oldest first.
  recentLog() {
    const rows = this.ctx.storage.sql.exec('SELECT entry FROM log ORDER BY id DESC LIMIT ?', LOG_KEEP).toArray();
    const out = [];
    let bytes = 0;
    for (const row of rows) {
      bytes += row.entry.length;
      if (bytes > LOG_SEND) break;
      out.push(row.entry);
    }
    return out.reverse().map(s => JSON.parse(s));
  }

  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const ws of this.sockets(except)) {
      if (ws.deserializeAttachment().joined) ws.send(s);
    }
  }

  async persist() {
    const r = this.r;
    r.touched = Date.now();
    await this.ctx.storage.put('room', { ...r, game: r.game ? r.game.toJSON() : null });
    await this.ctx.storage.setAlarm(r.touched + ROOM_TTL);
  }

  // One JSON line per meaningful event, for `wrangler tail` and Workers Logs. Aim updates
  // (many per second) are not logged, nor names or chat text.
  log(a, event, data) {
    console.log(JSON.stringify(Object.assign({ room: (this.r && this.r.id) || (a && a.id) || '', event }, data)));
  }

  stat(event, detail, numbers) {
    if (!this.env.STATS) return;
    try {
      this.env.STATS.writeDataPoint({ indexes: [this.r ? this.r.id : ''], blobs: [event, detail || ''], doubles: numbers || [] });
    } catch (e) { /* statistics must never break a game */ }
  }

  async alarm() {
    if (this.r && Date.now() - this.r.touched < ROOM_TTL) {
      await this.ctx.storage.setAlarm(this.r.touched + ROOM_TTL);
      return;
    }
    this.log(null, 'expired', {});
    for (const ws of this.ctx.getWebSockets()) ws.close(1001, 'room expired');
    this.r = null;
    await this.ctx.storage.deleteAll();
  }

  startMatch() {
    const r = this.r;
    r.game = new N.Game({ setsToWin: r.sets, first: Math.random() < 0.5 ? 0 : 1 });
    r.match = (r.match || 0) + 1;
    r.seq++;
    r.started = Date.now();
    r.shots = 0;
    this.stat('match_started', '', [r.sets, r.match]);
    const coin = { k: 'coin', who: r.game.first, set: 1, match: r.match };
    this.addLog([coin]);
    return coin;
  }

  /* ------------------------------------------------------------- messages */

  async webSocketMessage(ws, raw) {
    const a = ws.deserializeAttachment();
    // Token bucket: 40 messages burst, 20 per second sustained.
    const now = Date.now();
    a.bucket = Math.min(40, a.bucket + (now - a.at) / 50) - 1;
    a.at = now;
    ws.serializeAttachment(a);
    if (a.bucket < 0) { this.log(a, 'rate_limited', { seat: a.seat }); ws.close(1008, 'rate limit'); return; }
    if (typeof raw !== 'string' || raw.length > 4096) return;
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const send = msg => ws.send(JSON.stringify(msg));
    const fail = code => {
      this.log(a, 'refused', { type: m.t, code, seat: a.seat });
      send({ t: 'error', code });
    };

    if (m.t === 'create') {
      if (a.joined || this.r) return fail('already_in_room');
      const sets = [1, 2, 3].includes(m.sets) ? m.sets : 2;
      // The helpers (aim line, dark-puck hints) are fixed by the host for the room, so both
      // players play with the same ones.
      this.r = { id: a.id, created: now, touched: now, sets, seq: 0, match: 0, guide: m.guide === true, hints: m.hints === true,
        seats: [{ token: randomId(24), name: cleanName(m.name) }, null], game: null };
      this.logTable();   // gone if this room expired earlier in the object's lifetime
      this.stat('room_created', '', [sets]);
      this.log(a, 'created', { sets, guide: this.r.guide, hints: this.r.hints });
      this.join(ws, a, 0);
      // Save before telling anyone: a restart (a deploy) between the two must not leave
      // players with a room or a shot that the server has forgotten.
      await this.persist();
      send({ t: 'joined', room: a.id, seat: 0, token: this.r.seats[0].token, v: BUILD });
      send(this.stateMsg(true));
      return;
    }
    if (m.t === 'peek') {
      send(this.r ? { t: 'peek', room: a.id, sets: this.r.sets, guide: !!this.r.guide, hints: !!this.r.hints, seats: this.seatsView() } : { t: 'peek', room: a.id, missing: true });
      return;
    }
    const r = this.r;
    if (!r) return fail('no_room');
    if (m.t === 'join') {
      if (a.joined) return fail('already_in_room');
      let seat = r.seats.findIndex(s => s && typeof m.token === 'string' && s.token === m.token);
      let token = seat >= 0 ? r.seats[seat].token : null;
      let coin = null;
      if (seat < 0 && !r.seats[1] && !m.watch) {
        seat = 1;
        token = randomId(24);
        r.seats[1] = { token, name: cleanName(m.name) };
        coin = this.startMatch();
      }
      if (seat < 0) {
        a.name = cleanName(m.name);
        this.stat('spectator_joined');
      }
      this.log(a, seat < 0 ? 'watching' : 'joined', { seat, rejoin: !coin && seat >= 0, matchStarted: !!coin });
      this.join(ws, a, seat);
      await this.persist();
      send({ t: 'joined', room: r.id, seat, token, v: BUILD });
      send(this.stateMsg(true));
      this.broadcast(this.stateMsg(false), ws);
      if (coin) this.broadcast({ t: 'log', entries: [coin] }, ws);
      return;
    }
    if (!a.joined) return fail('no_room');
    if (m.t === 'shot') return this.shot(ws, a, m, fail);
    if (m.t === 'aim') return this.aim(ws, a, m);
    if (m.t === 'chat') {
      const text = typeof m.text === 'string' ? m.text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, CHAT_MAX) : '';
      if (!text) return;
      if (now - (a.chatAt || 0) < CHAT_GAP) return fail('slow_down');
      a.chatAt = now;
      ws.serializeAttachment(a);
      const name = a.seat >= 0 ? r.seats[a.seat].name : a.name || '';
      const entry = { k: 'chat', seat: a.seat, name, text, at: now };
      this.addLog([entry]);
      this.stat('chat');
      this.log(a, 'chat', { seat: a.seat, length: text.length });
      await this.persist();
      this.broadcast({ t: 'log', entries: [entry] });
      return;
    }
    if (m.t === 'rematch') {
      if (a.seat < 0 || !r.game || r.game.winner === null) return;
      const coin = this.startMatch();
      this.log(a, 'rematch', { seat: a.seat, match: r.match });
      await this.persist();
      this.broadcast(this.stateMsg(false));
      this.broadcast({ t: 'log', entries: [coin] });
      return;
    }
    if (m.t === 'sync') send(this.stateMsg(true));
  }

  join(ws, a, seat) {
    a.joined = true;
    a.seat = seat;
    ws.serializeAttachment(a);
  }

  async shot(ws, a, m, fail) {
    const r = this.r, g = r.game, seat = a.seat;
    if (!g || g.winner !== null) return fail('no_game');
    if (seat !== g.turn) return fail('not_your_turn');
    if (m.seq !== r.seq) return fail('stale');
    const { x, y, vx, vy } = m;
    if (![x, y, vx, vy].every(Number.isFinite)) return fail('bad_shot');
    const sp = Math.sqrt(vx * vx + vy * vy);
    if (sp < N.C.MIN_SPEED - 1e-6 || sp > N.C.MAX_SPEED + 1e-6) return fail('bad_shot');
    if (!g.canPlace(seat, x, y) || !g.canAim(seat, x, y, vx / sp, vy / sp)) return fail('bad_shot');

    const pre = g.toJSON(), setNo = g.setNo;
    const sim = g.shoot(x, y, vx, vy);
    sim.run();
    const res = g.resolve(sim);
    const post = g.toJSON();
    const log = N.logEntries(res, setNo);
    r.shots = (r.shots || 0) + 1;
    this.stat('shot', res.penalty ? 'penalty' : res.keep ? 'keep' : 'pass', [res.ownPot, res.oppPot]);
    let next = null;
    if (res.setResult) {
      this.stat('set_finished', res.setResult.k, [setNo]);
      g.nextSet(res.setResult);
      next = g.toJSON();
      if (g.winner !== null) {
        log.push({ k: 'matchWon', who: g.winner, set: setNo });
        this.stat('match_finished', '', [g.sets[0], g.sets[1], Math.round((Date.now() - (r.started || Date.now())) / 1000), r.shots]);
      }
    }
    r.seq++;
    this.addLog(log);
    this.log(a, 'shot', {
      seq: r.seq, seat, set: setNo, result: res.penalty ? 'penalty' : res.keep ? 'keep' : 'pass',
      own: res.ownPot, opp: res.oppPot, codes: res.msgs.map(x => x.k),
      setResult: res.setResult ? res.setResult.k : undefined, matchWinner: g.winner !== null ? g.winner : undefined
    });
    await this.persist();
    const out = { shooter: res.shooter, msgs: res.msgs, marks: res.marks, setResult: res.setResult };
    this.broadcast({ t: 'shot', v: BUILD, seq: r.seq, seat, shot: { x, y, vx, vy }, pre, post, next, out, log });
  }

  // Live striker and cue position for the opponent; relayed, never stored.
  aim(ws, a, m) {
    const g = this.r.game;
    if (!g || a.seat !== g.turn || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    const msg = { t: 'aim', seat: a.seat, seq: this.r.seq, x: m.x, y: m.y, dir: null, power: 0 };
    if (Array.isArray(m.dir) && m.dir.length === 2 && m.dir.every(Number.isFinite) && Number.isFinite(m.power)) {
      msg.dir = [m.dir[0], m.dir[1]];
      msg.power = Math.max(0, Math.min(1, m.power));
      msg.valid = !!m.valid;
    }
    this.broadcast(msg, ws);
  }

  webSocketClose(ws, code) {
    const a = ws.deserializeAttachment();
    if (a.joined) this.log(a, 'left', { seat: a.seat, code });
    if (this.r && a.joined) this.broadcast({ t: 'presence', seats: this.seatsView(ws) }, ws);
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }
}
