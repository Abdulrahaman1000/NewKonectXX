// SC-VTU part 1 (server): airtime, data and electricity, paid per purchase. Run from the project folder.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const MARK = "SC-VTU";
const NEW_FILES = [
  "server/models/VtuOrder.ts", "server/models/VtuSetting.ts",
  "server/services/vtu/provider.ts", "server/services/vtu/simulator.ts", "server/services/vtu/index.ts",
  "server/services/vtuService.ts", "server/routes/vtu.ts", "server/routes/admin/vtu.ts",
];
const die = (m) => { console.error("\n" + m + "\nNothing was changed."); process.exit(1); };
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

if (!fs.existsSync(path.join(root, "server/services/customerAuth.ts"))) die("Install the accounts update first (smartcombo-accounts.zip). VTU uses it for customer history.");
for (const f of ["server/index.ts", "server/routes/payments.ts", "server/services/paystackService.ts"]) if (!fs.existsSync(path.join(root, f))) die(`Cannot find ${f}. Run this from the project folder.`);
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
    lines.splice(e.before ? hits[0] : hits[0] + 1, 0, ...e.add);
  }
  plan.push({ file, out: lines.join(eol) });
}

chain("server/index.ts", [
  { label: "imports", find: (l) => /^import partnerRouter from ["']\.\/routes\/partner["'];?\s*$/.test(l),
    add: [`import vtuRouter from "./routes/vtu"; // ${MARK}`, `import adminVtuRouter from "./routes/admin/vtu"; // ${MARK}`] },
  { label: "public route", find: (l) => /^\s*app\.use\(["']\/api\/partner["'], partnerRouter\);?\s*$/.test(l), add: [`  app.use("/api/vtu", vtuRouter); // ${MARK}`] },
  { label: "admin route", find: (l) => /^\s*app\.use\(["']\/api\/admin\/fulfilment["'], requireAuth, adminFulfilmentRouter\);?\s*$/.test(l), add: [`  app.use("/api/admin/vtu", requireAuth, adminVtuRouter); // ${MARK}`] },
]);
chain("server/routes/payments.ts", [
  { label: "import", find: (l) => /^import \{ Order \} from ["']\.\.\/models\/Order["'];?\s*$/.test(l), add: [`import { handleWebhookCharge, isVtuReference } from "../services/vtuService"; // ${MARK}`] },
  { label: "webhook", before: true, find: (l) => /^\s*if \(eventType === "charge\.success" && reference\) \{\s*$/.test(l),
    add: [`      if (eventType === "charge.success" && isVtuReference(reference)) { await handleWebhookCharge(reference); return res.status(200).send("OK"); } // ${MARK}`] },
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
console.log("\nDone (part 1). Add VTU_PROVIDER=simulator to server\\.env to test (see TEST-vtu.md), then restart npm run dev.");
