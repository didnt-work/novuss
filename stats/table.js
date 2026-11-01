// Prints an Analytics Engine JSON result (on stdin) as an aligned table.
'use strict';
let input = '';
process.stdin.on('data', d => { input += d; });
process.stdin.on('end', () => {
  let res;
  try { res = JSON.parse(input); } catch (e) { process.stdout.write(input); process.exit(1); }
  const cols = res.meta.map(m => m.name);
  const rows = res.data.map(r => cols.map(c => String(r[c])));
  if (!rows.length) { console.log('No data yet (new events can take a few minutes to appear).'); return; }
  const width = cols.map((c, i) => Math.max(c.length, ...rows.map(r => r[i].length)));
  const line = cells => cells.map((v, i) => (i ? v.padStart(width[i]) : v.padEnd(width[i]))).join('  ');
  console.log(line(cols));
  for (const r of rows) console.log(line(r));
});
