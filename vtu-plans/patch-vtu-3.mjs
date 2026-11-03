// SC-VTU3: Plans and prices in Admin > VTU (own price per data plan, hide, rename, switch networks and electricity companies on or off).
// Replaces the VTU files from parts 1 to 2 and the connect update (they are ours, with no edits by you). Run from the project folder.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const FILES = [
  "server/models/VtuPlan.ts", "server/models/VtuSetting.ts", "server/services/vtuService.ts", "server/routes/admin/vtu.ts",
  "client/api/vtu.ts", "client/pages/AdminVtu.tsx",
];
const die = (m) => { console.error("\n" + m + "\nNothing was changed."); process.exit(1); };
for (const f of ["server/services/vtuService.ts", "client/pages/AdminVtu.tsx", "client/hooks/useVtuEnabled.ts"]) if (!fs.existsSync(path.join(root, f))) die(`Cannot find ${f}. Install the VTU and connect updates first.`);
for (const f of FILES) if (!fs.existsSync(path.join(here, "files", f))) die(`The package is missing files/${f}. Unzip the whole zip first.`);
for (const f of FILES) {
  const dest = path.join(root, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.copyFileSync(dest, dest + ".bak-vtu3");
  fs.copyFileSync(path.join(here, "files", f), dest);
  console.log("Wrote " + f);
}
console.log("\nDone. Restart npm run dev, open Admin > Airtime, data, electricity. Steps in TEST-vtu3.md.");
