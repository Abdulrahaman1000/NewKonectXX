// SC-LEGIT2: switches on electricity (Legitdataway meter check). Replaces only server/services/vtu/legitdataway.ts. Run from the project folder, after smartcombo-legitdataway.zip.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const f = "server/services/vtu/legitdataway.ts";
const dest = path.join(root, f);
if (!fs.existsSync(dest)) { console.error("Install smartcombo-legitdataway.zip first.\nNothing was changed."); process.exit(1); }
fs.copyFileSync(dest, dest + ".bak-legit2");
fs.copyFileSync(path.join(here, "files", f), dest);
console.log("Wrote " + f + "\nDone. Restart npm run dev. Electricity now checks the meter with Legitdataway.");
