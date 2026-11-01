// Writes public/version.js with a new build stamp. `npm run deploy` runs it first, so the
// page and the Worker of one deploy share a stamp, and open tabs notice a newer server.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const build = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '');
const file = path.join(__dirname, '..', 'public', 'version.js');
fs.writeFileSync(file, `// Build stamp, written by tools/stamp-version.js on every deploy.
(function (root) {
  var v = '${build}';
  if (typeof module !== 'undefined' && module.exports) module.exports = v;
  else root.NOVUSS_BUILD = v;
})(this);
`);
console.log('build ' + build);
