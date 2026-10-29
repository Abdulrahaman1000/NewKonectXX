/**
 * SC-VTU  A pretend provider for testing. Nothing real is sent and no money moves.
 * Trick numbers (last 4 digits of the phone or meter):
 *   0000  the provider says the purchase FAILED (tests the refund)
 *   9999  the provider says PENDING first, then SUCCESS when checked again
 *   1111  the call "times out" (we do not know the result); checking later says SUCCESS
 *   anything else: SUCCESS
 */
import type { BuyRequest, BuyResult, DataPlan, Disco, QueryResult, VtuProvider } from "./provider";

const PLANS: Array<[string, string, DataPlan["category"], number]> = [
  ["D1", "500 MB (1 day)", "daily", 150], ["D2", "1 GB (1 day)", "daily", 300],
  ["W1", "1 GB (7 days)", "weekly", 500], ["W2", "2 GB (7 days)", "weekly", 900], ["W3", "5 GB (7 days)", "weekly", 1450], ["W4", "10 GB (7 days)", "weekly", 2500],
  ["M1", "2 GB (30 days)", "monthly", 1450], ["M2", "5 GB (30 days)", "monthly", 2400], ["M3", "10 GB (30 days)", "monthly", 3900], ["M4", "20 GB (30 days)", "monthly", 7400],
];

export class SimulatorProvider implements VtuProvider {
  name = "simulator";
  simulated = true;
  private seen = new Map<string, { result: BuyResult; queries: number; unknown: boolean }>();

  async listDataPlans(network: string): Promise<DataPlan[]> {
    const k = ({ MTN: 1, Airtel: 0.98, Glo: 0.95, "9mobile": 1.02 } as any)[network] ?? 1;
    return PLANS.map(([code, name, category, cost]) => ({ code: `${network}-${code}`, name, validity: name.match(/\((.*)\)/)?.[1] ?? "", category, cost: Math.round(cost * k) }));
  }
  async discos(): Promise<Disco[]> {
    return [{ code: "IKEDC", name: "Ikeja Electric" }, { code: "EKEDC", name: "Eko Electric" }, { code: "IBEDC", name: "Ibadan Electric (IBEDC)" }, { code: "AEDC", name: "Abuja Electric" }, { code: "PHED", name: "Port Harcourt Electric" }, { code: "KEDCO", name: "Kano Electric" }];
  }
  async verifyMeter(p: { disco: string; type: "prepaid" | "postpaid"; meter: string }) {
    if (!/^\d{8,13}$/.test(p.meter)) return { ok: false, message: "Meter number should be 8 to 13 digits." };
    if (p.meter.endsWith("0000")) return { ok: false, message: "We could not find that meter. Check the number." };
    return { ok: true, name: "TEST CUSTOMER", address: "1 Sample Street, Ilorin" };
  }
  async buy(req: BuyRequest): Promise<BuyResult> {
    const prior = this.seen.get(req.reference);
    if (prior) return prior.result; // same reference again: same answer, never a second purchase
    const tail = (req.meter?.number ?? req.phone ?? "").slice(-4);
    const pref = "SIM-" + req.reference.slice(-8);
    if (tail === "1111") { this.seen.set(req.reference, { result: { status: "success", providerReference: pref }, queries: 0, unknown: true }); throw new Error("timeout"); }
    let result: BuyResult;
    if (tail === "0000") result = { status: "failed", providerReference: pref, message: "Provider could not complete the purchase." };
    else if (tail === "9999") result = { status: "pending", providerReference: pref, message: "Processing." };
    else result = { status: "success", providerReference: pref, message: "Successful", ...(req.service === "electricity" ? { token: "1234-5678-9012-3456-7890", units: "25.4 kWh" } : {}) };
    this.seen.set(req.reference, { result, queries: 0, unknown: false });
    return result;
  }
  async query(reference: string): Promise<QueryResult> {
    const s = this.seen.get(reference);
    if (!s) return { status: "not_found" };
    s.queries++;
    if (s.result.status === "pending" && s.queries >= 1) return { status: "success", providerReference: s.result.providerReference, message: "Successful" };
    return s.result;
  }
}
