// Adds "Pay in full to pre-order. Instalments are not available for pre-orders." to the product page and checkout notices.
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const NOTE = "Pay in full to pre-order. Instalments are not available for pre-orders.";
const edits = [
  { file: "client/components/PreorderNotice.tsx", find: "you get your money back.", add: ` <strong>${NOTE}</strong>` },
  { file: "client/pages/Checkout.tsx", find: "payment. If we cannot get them, you get your money back.", add: ` <strong>${NOTE}</strong>` },
];
const plan = [];
for (const e of edits) {
  const p = path.join(root, e.file);
  if (!fs.existsSync(p)) { console.error("Missing file: " + e.file + " (run this from the project folder)"); process.exit(1); }
  const src = fs.readFileSync(p, "utf8");
  if (src.includes(NOTE)) { console.log("Already applied: " + e.file); continue; }
  const n = src.split(e.find).length - 1;
  if (n !== 1) { console.error(`Cannot patch ${e.file}: expected 1 match, found ${n}. Nothing was changed.`); process.exit(1); }
  plan.push({ p, src: src.replace(e.find, e.find + e.add), file: e.file });
}
for (const x of plan) { fs.writeFileSync(x.p + ".bak-prenote", fs.readFileSync(x.p)); fs.writeFileSync(x.p, x.src); console.log("Patched " + x.file); }
console.log("Done.");
