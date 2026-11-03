/**
 * SC-PROV  VTpass provider (https://vtpass.com). One file; nothing else in the app knows about VTpass.
 *
 * Server .env:
 *   VTPASS_API_KEY=...        VTPASS_PUBLIC_KEY=PK_...        VTPASS_SECRET_KEY=SK_...
 *   VTPASS_ENV=sandbox        (test: nothing real is delivered)   or   VTPASS_ENV=live
 * Keys: VTpass profile > API Keys (sandbox and live have separate keys). Never put them in the browser code or in chat.
 *
 * From the VTpass documentation (read 1 Nov 2026):
 *   GET  requests send headers  api-key + public-key         (plan list)
 *   POST requests send headers  api-key + secret-key         (pay, requery, merchant-verify)
 *   POST /api/pay            airtime {request_id, serviceID, amount, phone}
 *                            data    {request_id, serviceID:<net>-data, billersCode:<phone>, variation_code, phone}
 *                            power   {request_id, serviceID:<disco>-electric, billersCode:<meter>, variation_code:prepaid|postpaid, amount, phone}
 *   POST /api/requery        {request_id}
 *   POST /api/merchant-verify {billersCode, serviceID, type:prepaid|postpaid}
 *   GET  /api/service-variations?serviceID=mtn-data
 *   request_id: at least 12 characters, the FIRST 12 are today's date+time in Lagos (YYYYMMDDHHmm); anything may follow.
 * How results are read (their "Response codes" page): code 000 + status "delivered" is success. Anything unclear, any timeout, "initiated",
 * "pending", 099, 089, 044, and "request id already exists" (014) are held as PENDING and checked again, never bought again.
 * Only a clear refusal is "failed" (the customer is refunded).
 */
import type { BuyRequest, BuyResult, DataPlan, Disco, QueryResult, VtuProvider } from "./provider";

const env = (k: string) => String(process.env[k] ?? "").trim();
export const vtpassConfigured = () => Boolean(env("VTPASS_API_KEY") && env("VTPASS_PUBLIC_KEY") && env("VTPASS_SECRET_KEY"));
export const vtpassSandbox = () => env("VTPASS_ENV").toLowerCase() !== "live";
const base = () => (vtpassSandbox() ? "https://sandbox.vtpass.com/api" : "https://vtpass.com/api");

// serviceIDs. Airtime uses the short one, data adds "-data". NOTE: only mtn, mtn-data and portharcourt-electric were read in the docs;
// the rest are VTpass's standard ids. If one is refused (code 012 "product does not exist") tell the developer which one.
const AIRTIME_ID: Record<string, string> = { MTN: "mtn", Airtel: "airtel", Glo: "glo", "9mobile": "etisalat" };
const DISCOS: Array<Disco & { id: string }> = [
  { code: "IKEDC", name: "Ikeja Electric", id: "ikeja-electric" }, { code: "EKEDC", name: "Eko Electric", id: "eko-electric" },
  { code: "KEDCO", name: "Kano Electric", id: "kano-electric" }, { code: "PHED", name: "Port Harcourt Electric", id: "portharcourt-electric" },
  { code: "JED", name: "Jos Electric", id: "jos-electric" }, { code: "IBEDC", name: "Ibadan Electric", id: "ibadan-electric" },
  { code: "KAEDCO", name: "Kaduna Electric", id: "kaduna-electric" }, { code: "AEDC", name: "Abuja Electric", id: "abuja-electric" },
  { code: "EEDC", name: "Enugu Electric", id: "enugu-electric" }, { code: "BEDC", name: "Benin Electric", id: "benin-electric" },
  { code: "ABA", name: "Aba Power", id: "aba-electric" }, { code: "YEDC", name: "Yola Electric", id: "yola-electric" },
];

// Result codes. See "Response codes" in the VTpass documentation.
const PENDING_CODES = new Set(["099", "089", "044", "014", "083"]); // 083 system error: we cannot tell if it was charged, so hold it
const SETUP_CODES = new Set(["018", "021", "022", "023", "024", "027", "028", "087", "085"]); // our wallet, account, keys, IP or reference format
const FAIL_CODES = new Set(["091", "016", "040", "010", "011", "012", "013", "017", "019", "030", "031", "032", "034", "035"]);
const SETUP_TEXT: Record<string, string> = {
  "018": "VTpass wallet is low. Fund your VTpass wallet.", "021": "VTpass says the account is locked.", "022": "VTpass says the account is suspended.",
  "023": "API access is not switched on for your VTpass account. Contact VTpass.", "024": "VTpass says the account is inactive.",
  "027": "VTpass does not allow this server's IP address. Add it under Whitelist IP in VTpass.", "028": "This product is not whitelisted on your VTpass account.",
  "087": "VTpass refused the keys. Check VTPASS_API_KEY, VTPASS_PUBLIC_KEY and VTPASS_SECRET_KEY.", "085": "VTpass refused the request id (date/time format).",
};
const CUSTOMER_SETUP_TEXT = "This purchase could not be completed right now. You will be refunded.";

const num = (v: any) => { const n = Number(String(v ?? "").replace(/[^\d.]/g, "")); return Number.isFinite(n) && n > 0 ? n : 0; };
/** Lagos time is always UTC+1 (no daylight saving). */
const lagosStamp = (d = new Date()) => new Date(d.getTime() + 3600_000).toISOString().replace(/\D/g, "").slice(0, 12);
const cleanToken = (v: any) => String(v ?? "").replace(/^\s*token\s*:?\s*/i, "").trim();

const days = (name: string) => {
  const m = String(name).match(/(\d+)\s*(hrs?|hours?|days?|weeks?|months?|years?|yrs?)\b/i);
  if (!m) return 30;
  const n = Number(m[1]), u = m[2].toLowerCase();
  if (u.startsWith("h")) return Math.max(1, Math.ceil(n / 24));
  if (u.startsWith("w")) return n * 7;
  if (u.startsWith("m")) return n * 30;
  if (u.startsWith("y")) return n * 365;
  return n;
};
const validityText = (name: string) => { const m = String(name).match(/(\d+)\s*(hrs?|hours?|days?|weeks?|months?|years?|yrs?)\b/i); return m ? `${m[1]} ${m[2].toLowerCase()}` : ""; };
const category = (name: string): DataPlan["category"] => { const d = days(name); return d <= 3 ? "daily" : d <= 14 ? "weekly" : "monthly"; };
const MAX_PLAN = 100000; // plans dearer than this are not offered (4.5TB yearly bundles and the like)

export class VtpassProvider implements VtuProvider {
  name = "vtpass";
  requiresPhone = true;
  private fetchFn: typeof fetch;
  private planCache = new Map<string, { at: number; plans: DataPlan[] }>();
  constructor(fetchFn: typeof fetch = fetch) { this.fetchFn = fetchFn; }

  /** True in sandbox: nothing real is delivered, so the live site refuses to use it (see index.ts). */
  get simulated() { return vtpassSandbox(); }

  makeRequestId(reference: string): string {
    return lagosStamp() + String(reference).replace(/^SC-VTU-/i, "").replace(/[^A-Za-z0-9]/g, "").slice(-14);
  }

  private async post(path: string, body: Record<string, unknown>, ms = 45000): Promise<any> {
    const res = await this.fetchFn(`${base()}${path}`, {
      method: "POST", headers: { "api-key": env("VTPASS_API_KEY"), "secret-key": env("VTPASS_SECRET_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(ms),
    });
    let j: any = null;
    try { j = await res.json(); } catch { /* not JSON */ }
    if (j === null || typeof j !== "object") throw new Error(`VTpass answered ${res.status} without a readable reply`);
    return j;
  }

  /** Turns one VTpass reply (purchase or requery) into our three outcomes. Anything unclear is pending. */
  private interpret(j: any, face: number): BuyResult {
    const code = String(j?.code ?? "").trim();
    const tx = j?.content?.transactions;
    const st = String(tx?.status ?? "").toLowerCase();
    const description = String(j?.response_description ?? "").slice(0, 200);
    const providerReference = String(tx?.transactionId ?? j?.requestId ?? "");

    if (code === "000" || code === "001") {
      if (st === "delivered") {
        const total = num(tx?.total_amount);
        const token = cleanToken(j?.token ?? tx?.extras ?? j?.purchased_code);
        const units = j?.units ? (/^[\d.]+$/.test(String(j.units)) ? `${j.units} kWh` : String(j.units)) : undefined;
        return { status: "success", code, providerReference, message: description, token: token || undefined, units, cost: total > 0 && (face <= 0 || total < face * 2 + 500) ? total : undefined };
      }
      if (st === "failed" || st === "reversed" || st === "rejected") return { status: "failed", code, providerReference, message: description || "The provider could not complete the purchase." };
      return { status: "pending", code, providerReference, message: description || "Processing." }; // initiated, pending, or no status yet
    }
    if (PENDING_CODES.has(code)) return { status: "pending", code, providerReference, message: description || "Processing." };
    if (SETUP_CODES.has(code)) {
      console.error(`[vtpass] SETUP PROBLEM code ${code}: ${SETUP_TEXT[code]}`);
      return { status: "failed", code, providerReference, setupProblem: true, message: CUSTOMER_SETUP_TEXT };
    }
    if (FAIL_CODES.has(code)) return { status: "failed", code, providerReference, message: code === "091" || code === "016" || code === "040" ? "The provider could not complete the purchase." : description || "The provider could not complete the purchase." };
    return { status: "pending", code, providerReference, message: description || "Processing." }; // not in their guide: hold and check again
  }

  async listDataPlans(network: string): Promise<DataPlan[]> {
    const sid = AIRTIME_ID[network]; if (!sid) return [];
    const hit = this.planCache.get(network);
    if (hit && Date.now() - hit.at < 600_000) return hit.plans;
    const res = await this.fetchFn(`${base()}/service-variations?serviceID=${sid}-data`, { headers: { "api-key": env("VTPASS_API_KEY"), "public-key": env("VTPASS_PUBLIC_KEY") }, signal: AbortSignal.timeout(20000) });
    const j: any = await res.json().catch(() => null);
    const list: any[] = j?.content?.variations ?? j?.content?.varations ?? [];
    if (!Array.isArray(list) || list.length === 0) {
      if (hit) return hit.plans; // the last good list is better than nothing
      throw new Error("VTpass returned no plans");
    }
    const seen = new Set<string>();
    const plans: DataPlan[] = [];
    for (const v of list) {
      const code = String(v?.variation_code ?? "").trim(); const cost = num(v?.variation_amount); const name = String(v?.name ?? "").trim();
      if (!code || !name || !cost || cost > MAX_PLAN || seen.has(code)) continue; // VTpass sometimes repeats a code: the first one wins
      seen.add(code);
      plans.push({ code, name, validity: validityText(name), category: category(name), cost });
    }
    this.planCache.set(network, { at: Date.now(), plans });
    return plans;
  }

  async discos(): Promise<Disco[]> { return DISCOS.map(({ code, name }) => ({ code, name })); }

  async verifyMeter(p: { disco: string; type: "prepaid" | "postpaid"; meter: string }) {
    const d = DISCOS.find((x) => x.code === p.disco);
    if (!d) return { ok: false, message: "Choose your electricity company." };
    if (!/^\d{8,13}$/.test(p.meter)) return { ok: false, message: "Meter number should be 8 to 13 digits." };
    try {
      const j = await this.post("/merchant-verify", { billersCode: p.meter, serviceID: d.id, type: p.type }, 25000);
      const c = j?.content ?? {};
      const name = String(c?.Customer_Name ?? "").trim();
      if (String(j?.code) === "000" && name && !c?.error && c?.WrongBillersCode !== true) {
        const min = num(c?.Min_Purchase_Amount);
        return { ok: true, name, address: String(c?.Address ?? "").trim(), minAmount: min || undefined };
      }
      return { ok: false, message: "We could not find that meter. Check the number, the company and prepaid or postpaid." };
    } catch {
      return { ok: false, message: "We could not check the meter right now. Please try again in a moment." };
    }
  }

  /** Sends one purchase. Network trouble throws (the caller keeps the purchase "processing"); a clear answer is returned. */
  async buy(req: BuyRequest): Promise<BuyResult> {
    const request_id = req.requestId || this.makeRequestId(req.reference);
    if (req.service === "airtime") {
      const serviceID = AIRTIME_ID[req.network];
      if (!serviceID) return { status: "failed", message: "Unknown network." };
      return this.interpret(await this.post("/pay", { request_id, serviceID, amount: req.amount, phone: req.phone }), req.amount);
    }
    if (req.service === "data") {
      const serviceID = AIRTIME_ID[req.network] ? `${AIRTIME_ID[req.network]}-data` : "";
      if (!serviceID || !req.planCode) return { status: "failed", message: "Unknown data plan." };
      return this.interpret(await this.post("/pay", { request_id, serviceID, billersCode: req.phone, variation_code: req.planCode, phone: req.phone }), req.amount);
    }
    const d = DISCOS.find((x) => x.code === req.network);
    if (!d || !req.meter) return { status: "failed", message: "Unknown electricity company." };
    if (!req.phone) return { status: "failed", message: "A phone number is needed for electricity." };
    return this.interpret(await this.post("/pay", { request_id, serviceID: d.id, billersCode: req.meter.number, variation_code: req.meter.type, amount: req.amount, phone: req.phone }), req.amount);
  }

  async query(reference: string, requestId?: string): Promise<QueryResult> {
    if (!requestId) return { status: "not_found", message: "No VTpass reference was saved for this purchase." };
    const j = await this.post("/requery", { request_id: requestId }, 25000);
    if (String(j?.code) === "015") return { status: "not_found" }; // VTpass never saw this request id
    return this.interpret(j, 0);
  }
}
