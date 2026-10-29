// SC-VTU part 2 (screens): the Pay page, result page, home card, admin VTU page, routes and a dashboard tile. Run from the project folder, after part 1.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const MARK = "SC-VTU";
const NEW_FILES = ["client/api/vtu.ts", "client/pages/Pay.tsx", "client/pages/PayResult.tsx", "client/pages/AdminVtu.tsx", "client/components/RechargeCard.tsx"];
const die = (m) => { console.error("\n" + m + "\nNothing was changed."); process.exit(1); };
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

if (!fs.existsSync(path.join(root, "server/services/vtuService.ts"))) die("Run patch-vtu-1.mjs first (the server part).");
if (!fs.existsSync(path.join(root, "client/lib/customerSession.ts"))) die("Install the accounts update first (smartcombo-accounts.zip).");
for (const f of ["client/App.tsx", "client/pages/AdminDashboard.tsx"]) if (!fs.existsSync(path.join(root, f))) die(`Cannot find ${f}. Run this from the project folder.`);
for (const f of NEW_FILES) if (!fs.existsSync(path.join(here, "files", f))) die(`The package is missing files/${f}. Unzip the whole zip first.`);

const plan = [];
function chain(file, edits) {
  const src = read(file);
  if (src.includes(MARK)) { console.log(`Already edited: ${file}`); return; }
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const lines = src.split(/\r?\n/);
  for (const e of edits) {
    const hits = lines.map((l, i) => (e.find(l) ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) die(`Cannot edit ${file} (${e.label}): expected 1 matching line, found ${hits.length}.`);
    lines.splice(hits[0] + 1, 0, ...e.add);
  }
  plan.push({ file, out: lines.join(eol) });
}

chain("client/App.tsx", [
  { label: "imports", find: (l) => /^import OrderTracking from /.test(l),
    add: [`import Pay from './pages/Pay'; // ${MARK}`, `import PayResult from './pages/PayResult'; // ${MARK}`, `import AdminVtu from './pages/AdminVtu'; // ${MARK}`] },
  { label: "routes", find: (l) => /<Route path="[^"]+" element=\{<OrderTracking \/>\} \/>/.test(l),
    add: [`                  <Route path="/pay" element={<Pay />} />`, `                  <Route path="/pay/result" element={<PayResult />} />`, `                  <Route path="/admin/vtu" element={<AdminProtectedRoute><AdminVtu /></AdminProtectedRoute>} />`] },
]);
chain("client/pages/AdminDashboard.tsx", [
  { label: "tile", find: (l) => /<TileLink to="\/admin\/fulfilment\?tab=instalments"/.test(l),
    add: [`            <TileLink to="/admin/vtu" Icon={Package} label="Airtime, data, electricity" desc="Recharge sales, profit, refunds, prices" /> {/* ${MARK} */}`] },
]);

for (const f of NEW_FILES) {
  const dest = path.join(root, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.copyFileSync(dest, dest + ".bak-vtu");
  fs.copyFileSync(path.join(here, "files", f), dest);
  console.log("Wrote " + f);
}
for (const p of plan) {
  const full = path.join(root, p.file);
  fs.copyFileSync(full, full + ".bak-vtu");
  fs.writeFileSync(full, p.out);
  console.log("Edited " + p.file);
}
console.log("\nDone (part 2). Restart npm run dev and open /pay. Steps in TEST-vtu.md.");
