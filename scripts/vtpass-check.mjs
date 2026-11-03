// SC-PROV: checks your VTpass SANDBOX keys without opening the website. Run from the project folder:  node scripts/vtpass-check.mjs
// It lists MTN data plans, checks a test meter, buys N100 test airtime for the VTpass test phone 08011111111, then asks VTpass about it.
// Nothing real is bought: it refuses to run unless VTPASS_ENV is sandbox.
import fs from "node:fs";
for (const f of [".env", "server/.env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); // the first file wins, like the server
  }
}
const e = (k) => String(process.env[k] ?? "").trim();
const miss = ["VTPASS_API_KEY", "VTPASS_PUBLIC_KEY", "VTPASS_SECRET_KEY"].filter((k) => !e(k));
if (miss.length) { console.error("Missing in your .env: " + miss.join(", ")); process.exit(1); }
if (e("VTPASS_ENV").toLowerCase() === "live") { console.error("VTPASS_ENV is live. This check only runs in sandbox, so no real money is touched."); process.exit(1); }
const B = "https://sandbox.vtpass.com/api";
const get = async (p) => (await fetch(B + p, { headers: { "api-key": e("VTPASS_API_KEY"), "public-key": e("VTPASS_PUBLIC_KEY") } })).json();
const post = async (p, b) => (await fetch(B + p, { method: "POST", headers: { "api-key": e("VTPASS_API_KEY"), "secret-key": e("VTPASS_SECRET_KEY"), "Content-Type": "application/json" }, body: JSON.stringify(b) })).json();
const lagos = new Date(Date.now() + 3600_000).toISOString().replace(/\D/g, "").slice(0, 12);
const step = (n, ok, text) => console.log(`${ok ? "PASS" : "FAIL"}  ${n}: ${text}`);

const v = await get("/service-variations?serviceID=mtn-data").catch((x) => ({ err: String(x) }));
const list = v?.content?.variations ?? v?.content?.varations ?? [];
step("MTN data plans", list.length > 0, list.length ? `${list.length} plans, first: ${list[0].name} (${list[0].variation_amount})` : JSON.stringify(v).slice(0, 200));

const m = await post("/merchant-verify", { billersCode: "1111111111111", serviceID: "portharcourt-electric", type: "prepaid" }).catch((x) => ({ err: String(x) }));
step("Test meter", m?.code === "000" && !!m?.content?.Customer_Name, m?.content?.Customer_Name ? `name ${m.content.Customer_Name}, minimum ${m.content.Min_Purchase_Amount}` : JSON.stringify(m).slice(0, 200));

const rid = lagos + "CHECK" + Math.floor(Math.random() * 1e6);
const p = await post("/pay", { request_id: rid, serviceID: "mtn", amount: 100, phone: "08011111111" }).catch((x) => ({ err: String(x) }));
const st = p?.content?.transactions?.status;
step("Test airtime N100", p?.code === "000" && st === "delivered", `code ${p?.code}, status ${st}, we pay ${p?.content?.transactions?.total_amount}`);

const q = await post("/requery", { request_id: rid }).catch((x) => ({ err: String(x) }));
step("Ask about it again", q?.code === "000" && q?.content?.transactions?.status === "delivered", `code ${q?.code}, status ${q?.content?.transactions?.status}`);
console.log("\nIf all four say PASS, your keys and the VTpass test connection work.");
