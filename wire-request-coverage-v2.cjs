// wire-request-coverage-v2.cjs
// Moves the "Request coverage" banner to ALWAYS-VISIBLE: removes any old
// empty-state placement and inserts one instance just above the results
// header, so it shows even when (far-away) hotspots are listed. Idempotent.
// Run from connecX repo root:  node wire-request-coverage-v2.cjs
const fs = require('fs');
const f = 'client/pages/EndUsersDashboard/Hotspots.tsx';
let s;
try { s = fs.readFileSync(f, 'utf8'); } catch (e) { console.log('Hotspots.tsx NOT FOUND at ' + f); process.exit(0); }
const out = [];
let lines = s.split('\n');

// 1) remove any existing standalone <RequestCoverageCard /> placements
const before = lines.length;
lines = lines.filter((l) => l.trim() !== '<RequestCoverageCard />');
if (lines.length < before) out.push('removed old placement(s): ' + (before - lines.length));

// 2) insert ONE instance just before the Results Header (always visible)
const i = lines.findIndex((l) => l.includes('{/* Results Header */}'));
if (i < 0) out.push('ANCHOR ({/* Results Header */}) NOT FOUND');
else {
  const indent = (lines[i].match(/^\s*/) || [''])[0];
  lines.splice(i, 0, indent + '<RequestCoverageCard />');
  out.push('card: inserted (always visible)');
}
s = lines.join('\n');

// 3) ensure the import is present
if (!s.includes('import RequestCoverageCard')) {
  s = 'import RequestCoverageCard from "@/components/RequestCoverageCard";\n' + s;
  out.push('import: ADDED');
} else out.push('import: already present');

fs.writeFileSync(f, s);
console.log(out.join('\n'));
