/**
 * SC-LEGIT  Legitdataway provider (https://legitdataway.com/api). One file; nothing else in the app knows about Legitdataway.
 *
 * Server .env:
 *   VTU_PROVIDER=legitdataway
 *   LEGIT_TOKEN=<your API token from Legitdataway > Pricing>        (simplest), or
 *   LEGIT_USERNAME=... and LEGIT_PASSWORD=...                         (the adapter fetches a token itself)
 *
 * Confirmed from their documentation (31 Oct 2026):
 *   Data      POST /api/data    { network, phone, data_plan, bypass:false, "request-id" }
 *   Airtime   POST /api/topup   { network, phone, plan_type:"VTU", amount, bypass:false, "request-id" }
 *   Electric  POST /api/bill    { disco, meter_type, meter_number, amount, bypass:false, "request-id" }
 *   Auth      Authorization: Token <token>.   Success reply: status:"success", oldbal, newbal (electricity also token).
 * NOT yet confirmed (marked TODO below): meter check, status lookup, the exact failed/pending reply, a plan-list call.
 * Until those are confirmed this adapter fails safe:
 *   - only status "success" counts as success; an explicit failure is "failed" (refunded); anything unclear is "pending"
 *     (held, never retried, and the admin decides after looking at the Legitdataway dashboard).
 *   - the meter check refuses, so electricity cannot be bought until it is set up.
 */
import fs from "node:fs";
import path from "node:path";
import type { BuyRequest, BuyResult, DataPlan, Disco, QueryResult, VtuProvider } from "./provider";

const BASE = "https://legitdataway.com/api";
const NETWORK_ID: Record<string, number> = { MTN: 1, Airtel: 2, Glo: 3, "9mobile": 4 };

// Electricity company IDs from the Pricing page.
const DISCOS: Array<Disco & { id: number }> = [
  { code: "IKEDC", name: "Ikeja Electric", id: 1 }, { code: "EKEDC", name: "Eko Electric", id: 2 }, { code: "KEDCO", name: "Kano Electric", id: 3 },
  { code: "PHED", name: "Port Harcourt Electric", id: 4 }, { code: "JED", name: "Jos Electric", id: 5 }, { code: "IBEDC", name: "Ibadan Electric", id: 6 },
  { code: "KAEDCO", name: "Kaduna Electric", id: 7 }, { code: "AEDC", name: "Abuja Electric", id: 8 }, { code: "YEDC", name: "Yola Electric", id: 9 },
  { code: "BEDC", name: "Benin Electric", id: 10 },
];

interface RawPlan { id: number; network: string; type: string; name: string; amount: number; validity: string }

function loadPlans(): RawPlan[] {
  const file = process.env.LEGIT_PLANS_FILE || path.join(process.cwd(), "server/services/vtu/legitPlans.json");
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return []; }
}
const days = (v: string) => { const m = String(v).match(/(\d+)\s*(day|week|month)/i); if (!m) return 30; const n = Number(m[1]); return /week/i.test(m[2]) ? n * 7 : /month/i.test(m[2]) ? n * 30 : n; };
const category = (v: string): DataPlan["category"] => { const d = days(v); return d <= 3 ? "daily" : d <= 14 ? "weekly" : "monthly"; };
const num = (v: any) => { const n = Number(String(v ?? "").replace(/[^\d.]/g, "")); return Number.isFinite(n) && n > 0 ? n : 0; };

export class LegitdatawayProvider implements VtuProvider {
  name = "legitdataway";
  simulated = false;
  private token = process.env.LEGIT_TOKEN?.trim() || "";
  private fetchFn: typeof fetch;
  constructor(fetchFn: typeof fetch = fetch) { this.fetchFn = fetchFn; }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    const u = process.env.LEGIT_USERNAME, p = process.env.LEGIT_PASSWORD;
    if (!u || !p) throw new Error("Legitdataway credentials missing");
    const res = await this.fetchFn(`${BASE}/user`, { method: "POST", headers: { Authorization: "Basic " + Buffer.from(`${u}:${p}`).toString("base64"), "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000) });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || !j?.AccessToken) throw new Error("Legitdataway login failed");
    return (this.token = String(j.AccessToken));
  }

  /** Sends a purchase. Network trouble throws (the caller keeps the purchase "processing"); a clear answer is returned. */
  private async post(endpoint: string, body: Record<string, unknown>): Promise<{ http: number; j: any }> {
    const token = await this.getToken();
    const res = await this.fetchFn(`${BASE}/${endpoint}`, {
      method: "POST", headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, bypass: false }), signal: AbortSignal.timeout(40000),
    });
    let j: any = null;
    try { j = await res.json(); } catch { /* not JSON */ }
    if (j === null) throw new Error(`Legitdataway answered ${res.status} without a readable reply`);
    return { http: res.status, j };
  }

  private interpret(http: number, j: any, face: number): BuyResult {
    const st = String(j?.status ?? "").toLowerCase();
    const message = String(j?.message ?? j?.response ?? j?.error ?? "").slice(0, 300);
    const providerReference = String(j?.["request-id"] ?? "");
    if (st === "success" || st === "successful") {
      const old = num(j.oldbal), nu = num(j.newbal);
      const debit = old && nu && old > nu ? Math.round((old - nu) * 100) / 100 : 0;
      return { status: "success", providerReference, message, token: j?.token ? String(j.token) : undefined, cost: debit > 0 && debit < face * 2 + 500 ? debit : undefined };
    }
    if (["fail", "failed", "failure", "error", "unsuccessful", "declined"].includes(st) || (http >= 400 && http < 500 && st !== "pending" && st !== "processing")) {
      return { status: "failed", providerReference, message: message || "The provider could not complete the purchase." };
    }
    return { status: "pending", providerReference, message: message || "Processing." }; // TODO: confirm exact pending wording with Legitdataway
  }

  async listDataPlans(network: string): Promise<DataPlan[]> {
    return loadPlans().filter((p) => p.network === network).map((p) => ({
      code: `${network}-${p.id}`, name: `${p.name} ${p.type} (${p.validity})`.replace(/\s+/g, " ").trim(), validity: p.validity, category: category(p.validity), cost: p.amount,
    }));
  }
  async discos(): Promise<Disco[]> { return DISCOS.map(({ code, name }) => ({ code, name })); }

  async verifyMeter(): Promise<{ ok: boolean; name?: string; address?: string; message?: string }> {
    // TODO: connect Legitdataway's "Verify METER" call once its page is confirmed. Until then electricity is refused rather than guessed.
    return { ok: false, message: "Electricity is not available yet. Please try again later." };
  }

  async buy(req: BuyRequest): Promise<BuyResult> {
    const rid = req.reference;
    if (req.service === "airtime") {
      const { http, j } = await this.post("topup", { network: NETWORK_ID[req.network], phone: req.phone, plan_type: "VTU", amount: req.amount, "request-id": rid });
      return this.interpret(http, j, req.amount);
    }
    if (req.service === "data") {
      const idText = String(req.planCode ?? "").split("-").slice(1).join("-");
      const id = Number(idText);
      if (!NETWORK_ID[req.network] || !/^\d+$/.test(idText) || !(id > 0)) return { status: "failed", message: "Unknown data plan." };
      const { http, j } = await this.post("data", { network: NETWORK_ID[req.network], phone: req.phone, data_plan: id, "request-id": rid });
      return this.interpret(http, j, req.amount);
    }
    const disco = DISCOS.find((d) => d.code === req.network);
    if (!disco || !req.meter) return { status: "failed", message: "Unknown electricity company." };
    const { http, j } = await this.post("bill", { disco: disco.id, meter_type: req.meter.type, meter_number: req.meter.number, amount: req.amount, "request-id": rid });
    return this.interpret(http, j, req.amount);
  }

  async query(): Promise<QueryResult> {
    // TODO: no status-lookup call confirmed yet. "not_found" makes the admin page ask the owner to check the Legitdataway dashboard.
    return { status: "not_found" };
  }
}
