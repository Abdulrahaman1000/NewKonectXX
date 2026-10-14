import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.mjs'];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// true only if every part of the path exists with exactly this capitalisation
function exactExists(p) {
  const rel = path.relative(root, p).split(path.sep);
  let cur = root;
  for (const seg of rel) {
    if (!fs.existsSync(cur) || !fs.statSync(cur).isDirectory()) return false;
    if (!fs.readdirSync(cur).includes(seg)) return false;
    cur = path.join(cur, seg);
  }
  return true;
}

function resolves(base) {
  for (const ext of exts) if (exactExists(base + ext) && fs.statSync(base + ext).isFile()) return true;
  for (const ext of exts.slice(1)) if (exactExists(path.join(base, 'index' + ext))) return true;
  return false;
}

let problems = 0;
for (const file of [...walk(path.join(root, 'client')), ...walk(path.join(root, 'server'))]) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    let base;
    if (spec.startsWith('@/')) base = path.join(root, 'client', spec.slice(2));
    else if (spec.startsWith('./') || spec.startsWith('../')) base = path.resolve(path.dirname(file), spec);
    else continue;
    if (!resolves(base)) {
      problems++;
      console.log(`${path.relative(root, file)}  ->  ${spec}`);
    }
  }
}
console.log(problems === 0 ? 'No problems found.' : `${problems} problem(s) found.`);