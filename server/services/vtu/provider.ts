/**
 * SC-VTU  What a VTU provider (ClickPay, VTpass, ...) must be able to do.
 * To connect a real provider, write one class that implements VtuProvider in its own file, return it from getProvider(),
 * and set VTU_PROVIDER=<name> in the server .env. Nothing else in the app changes.
 * Never put provider keys in the browser code.
 */
export type Network = "MTN" | "Airtel" | "Glo" | "9mobile";
export const NETWORKS: Network[] = ["MTN", "Airtel", "Glo", "9mobile"];

export interface DataPlan { code: string; name: string; validity: string; category: "daily" | "weekly" | "monthly"; cost: number }
export interface Disco { code: string; name: string }
export type BuyStatus = "success" | "pending" | "failed";

export interface BuyRequest {
  reference: string; // our unique reference; the provider must never run the same reference twice
  service: "airtime" | "data" | "electricity";
  network: string;
  phone?: string;
  planCode?: string;
  amount: number; // face value in naira (airtime and electricity)
  meter?: { number: string; type: "prepaid" | "postpaid" };
}
export interface BuyResult { status: BuyStatus; providerReference?: string; message?: string; token?: string; units?: string; cost?: number }
export interface QueryResult extends BuyResult { status: BuyStatus | "not_found" }

export interface VtuProvider {
  name: string;
  simulated: boolean;
  listDataPlans(network: string): Promise<DataPlan[]>;
  discos(): Promise<Disco[]>;
  verifyMeter(p: { disco: string; type: "prepaid" | "postpaid"; meter: string }): Promise<{ ok: boolean; name?: string; address?: string; message?: string }>;
  buy(req: BuyRequest): Promise<BuyResult>;
  query(reference: string): Promise<QueryResult>;
}
