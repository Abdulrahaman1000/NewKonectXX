// SC-ACCT  Customer accounts with email sign-in code. Run from the project folder.
// Adds new files, and makes two small edits: server/index.ts (mount /api/account) and client/App.tsx (the /account page).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const MARK = "SC-ACCT";
const NEW_FILES = [
  "server/models/Customer.ts", "server/models/LoginCode.ts", "server/services/customerAuth.ts", "server/routes/account.ts",
  "client/api/account.ts", "client/lib/customerSession.ts", "client/pages/Account.tsx",
];
const die = (m) => { console.error("\n" + m + "\nNothing was changed."); process.exit(1); };
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const eolOf = (s) => (s.includes("\r\n") ? "\r\n" : "\n");

for (const f of ["server/index.ts", "client/App.tsx", "server/services/giftProgress.ts", "server/services/orderService.ts"]) {
  if (!fs.existsSync(path.join(root, f))) die(`Cannot find ${f}. Run this from the project folder (the one that has client and server).`);
}
for (const f of NEW_FILES) if (!fs.existsSync(path.join(here, "files", f))) die(`The package is missing files/${f}. Unzip the whole zip first.`);

// ---- plan the two edits ----
const plan = [];
function insertAfterLine(file, finder, text, label) {
  const src = read(file);
  if (src.includes(MARK)) { console.log(`Already edited: ${file} (${label})`); return; }
  const eol = eolOf(src);
  const lines = src.split(/\r?\n/);
  const hits = lines.map((l, i) => (finder(l) ? i : -1)).filter((i) => i >= 0);
  if (hits.length !== 1) die(`Cannot edit ${file} (${label}): expected 1 matching line, found ${hits.length}.`);
  lines.splice(hits[0] + 1, 0, ...text);
  plan.push({ file, out: lines.join(eol) });
}
function chain(file, edits) {
  // apply several line edits to the same file in memory
  let src = read(file);
  if (src.includes(MARK)) { console.log(`Already edited: ${file}`); return; }
  const eol = eolOf(src);
  let lines = src.split(/\r?\n/);
  for (const e of edits) {
    const hits = lines.map((l, i) => (e.find(l) ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) die(`Cannot edit ${file} (${e.label}): expected 1 matching line, found ${hits.length}.`);
    lines.splice(hits[0] + 1, 0, ...e.add);
  }
  plan.push({ file, out: lines.join(eol) });
}

chain("server/index.ts", [
  { label: "import", find: (l) => /^import partnerRouter from ["']\.\/routes\/partner["'];?\s*$/.test(l), add: [`import accountRouter from "./routes/account"; // ${MARK}`] },
  { label: "mount", find: (l) => /^\s*app\.use\(["']\/api\/partner["'], partnerRouter\);?\s*$/.test(l), add: [`  app.use("/api/account", accountRouter); // ${MARK}`] },
]);
chain("client/App.tsx", [
  { label: "import", find: (l) => /^import OrderTracking from /.test(l), add: [`import Account from './pages/Account'; // ${MARK}`] },
  { label: "route", find: (l) => /<Route path="[^"]+" element=\{<OrderTracking \/>\} \/>/.test(l), add: [`                  <Route path="/account" element={<Account />} />`] },
]);

// ---- write ----
for (const f of NEW_FILES) {
  const dest = path.join(root, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.copyFileSync(dest, dest + ".bak-acct");
  fs.copyFileSync(path.join(here, "files", f), dest);
  console.log("Wrote " + f);
}
for (const p of plan) {
  const full = path.join(root, p.file);
  fs.copyFileSync(full, full + ".bak-acct");
  fs.writeFileSync(full, p.out);
  console.log("Edited " + p.file);
}
console.log("\nDone. Restart npm run dev, then open /account. Steps are in TEST-accounts.md.");
