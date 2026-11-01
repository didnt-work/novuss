// Turns `wrangler tail --format json` into one readable line per game event:
//   npm run logs            game events, errors and failed invocations
//   npm run logs -- --all   also every WebSocket message without a log line (aim updates)
'use strict';
const showAll = process.argv.includes('--all');

const time = ms => new Date(ms).toLocaleTimeString('lv-LV', { hour12: false });
const seat = s => (s === 0 ? 'host' : s === 1 ? 'guest' : s === -1 ? 'spectator' : '?');

function describe(e) {
  switch (e.event) {
    case 'created': return `room created · first to ${e.sets} · aim line ${e.guide ? 'on' : 'off'}, hints ${e.hints ? 'on' : 'off'}`;
    case 'joined': return `${seat(e.seat)} ${e.rejoin ? 'rejoined' : 'joined'}${e.matchStarted ? ' · match started' : ''}`;
    case 'watching': return 'spectator joined';
    case 'shot': {
      let s = `shot #${e.seq} by ${seat(e.seat)} · set ${e.set} · ${e.result}`;
      if (e.own || e.opp) s += ` · pocketed ${e.own} own, ${e.opp} opponent's`;
      const notes = (e.codes || []).filter(c => c !== 'pocketed' && c !== 'noOwn');
      if (notes.length) s += ` · ${notes.join(', ')}`;
      if (e.setResult) s += ` · SET: ${e.setResult}`;
      if (e.matchWinner !== undefined) s += ` · MATCH won by ${seat(e.matchWinner)}`;
      return s;
    }
    case 'chat': return `chat from ${seat(e.seat)} (${e.length} chars)`;
    case 'rematch': return `rematch (match ${e.match})`;
    case 'refused': return `refused ${e.type} from ${seat(e.seat)}: ${e.code}`;
    case 'rate_limited': return `${seat(e.seat)} disconnected for sending too fast`;
    case 'left': return `${seat(e.seat)} left${e.code ? ` (close ${e.code})` : ''}`;
    case 'expired': return 'room expired and deleted';
    default: return JSON.stringify(e);
  }
}

function show(ev) {
  const at = time(ev.eventTimestamp || Date.now());
  const logs = ev.logs || [];
  for (const l of logs) {
    const text = Array.isArray(l.message) ? l.message.join(' ') : String(l.message);
    let e = null;
    try { e = JSON.parse(text); } catch (x) { /* not one of ours */ }
    console.log(e && e.event ? `${at}  ${e.room}  ${describe(e)}` : `${at}  ${l.level}: ${text}`);
  }
  for (const x of ev.exceptions || []) console.log(`${at}  EXCEPTION ${x.name}: ${x.message}`);
  // The request that opened a WebSocket ends as "canceled" when the connection closes: normal.
  const req = ev.event && ev.event.request;
  const closedSocket = ev.outcome === 'canceled' && req && /\/ws\?/.test(req.url);
  if (closedSocket) { if (showAll) console.log(`${at}  websocket connection ended (${req.url.split('?')[1]})`); return; }
  if (ev.outcome && ev.outcome !== 'ok') console.log(`${at}  outcome: ${ev.outcome}`);
  if (showAll && !logs.length) {
    const ws = ev.event && ev.event.getWebSocketEvent;
    console.log(`${at}  ${ws ? 'websocket ' + ws.webSocketEventType : req ? req.method + ' ' + req.url : Object.keys(ev.event || {}).join(',') || 'event'}`);
  }
}

// wrangler prints each event as indented JSON over many lines, so read whole objects.
let buf = '', depth = 0, inString = false, escaped = false, start = -1;
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  for (let i = 0; i < chunk.length; i++) {
    const c = chunk[i];
    buf += c;
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"' && depth > 0) inString = true;
    else if (c === '{') { if (depth++ === 0) start = buf.length - 1; }
    else if (c === '}' && depth > 0 && --depth === 0) {
      try { show(JSON.parse(buf.slice(start))); } catch (x) { /* skip anything malformed */ }
      buf = '';
    }
  }
  if (depth === 0) buf = '';   // drop wrangler's own status text between events
});
