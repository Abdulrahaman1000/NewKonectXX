// SC-LEGIT: connects Legitdataway (airtime, data, electricity company list) as a VTU provider, adds "Mark delivered" to the admin VTU page,
// and a script to import your data plans. Run from the project folder, after the VTU, connect and plans updates.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const FILES = [
  "server/services/vtu/legitdataway.ts", "server/services/vtu/index.ts", "server/services/vtuService.ts", "server/routes/admin/vtu.ts",
  "client/api/vtu.ts", "client/pages/AdminVtu.tsx", "scripts/legit-plans-import.mjs",
];
const die = (m) => { console.error("\n" + m + "\nNothing was changed."); process.exit(1); };
if (!fs.existsSync(path.join(root, "server/models/VtuPlan.ts"))) die("Install the 'Plans and prices' update first (smartcombo-vtu-plans.zip).");
for (const f of FILES) {
  const src = f === "scripts/legit-plans-import.mjs" ? path.join(here, f) : path.join(here, "files", f);
  if (!fs.existsSync(src)) die(`The package is missing ${f}. Unzip the whole zip first.`);
}
for (const f of FILES) {
  const src = f === "scripts/legit-plans-import.mjs" ? path.join(here, f) : path.join(here, "files", f);
  const dest = path.join(root, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.copyFileSync(dest, dest + ".bak-legit");
  fs.copyFileSync(src, dest);
  console.log("Wrote " + f);
}
console.log("\nDone. Next: import your plans and set the token. Steps in TEST-legitdataway.md.");
