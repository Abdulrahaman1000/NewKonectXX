// Turns the Data Plans table you copy from Legitdataway > Pricing into server/services/vtu/legitPlans.json.
// Usage (project folder):  node scripts/legit-plans-import.mjs legit-plans.txt
// The text file = the table pasted as-is. Columns (tab or 2+ spaces apart): Plan ID, Network, Plan Type, Plan Name, Amount, Validity.
import fs from "node:fs";
const src = process.argv[2];
if (!src || !fs.existsSync(src)) { console.error("Usage: node scripts/legit-plans-import.mjs <pasted-table.txt>"); process.exit(1); }
const NET = { MTN: "MTN", AIRTEL: "Airtel", GLO: "Glo", "9MOBILE": "9mobile", ETISALAT: "9mobile" };
const out = []; const bad = [];
for (const raw of fs.readFileSync(src, "utf8").split(/\r?\n/)) {
  const line = raw.trim(); if (!line) continue;
  const cols = line.split(/\t+|\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (cols.length < 6 || !/^\d+$/.test(cols[0])) { if (!/^plan id/i.test(line)) bad.push(line); continue; }
  const network = NET[cols[1].toUpperCase().replace(/\s/g, "")];
  const amount = Number(cols[4].replace(/[^\d.]/g, ""));
  if (!network || !amount) { bad.push(line); continue; }
  out.push({ id: Number(cols[0]), network, type: cols[2], name: cols[3], amount, validity: cols.slice(5).join(" ") });
}
fs.mkdirSync("server/services/vtu", { recursive: true });
fs.writeFileSync("server/services/vtu/legitPlans.json", JSON.stringify(out, null, 1));
const by = {}; for (const p of out) by[p.network] = (by[p.network] || 0) + 1;
console.log(`Saved ${out.length} plans:`, by);
if (bad.length) console.log(`Skipped ${bad.length} line(s) I could not read, e.g.: ${bad.slice(0, 3).join(" | ")}`);
