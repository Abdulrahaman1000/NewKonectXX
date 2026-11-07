/**
 * SC-VTU  What a VTU provider (VTpass, Legitdataway, ...) must be able to do.
 * To connect another provider: write one class that implements VtuProvider in its own file, add it to PROVIDERS in index.ts,
 * and put its keys in the server .env. It then appears in Admin > VTU > Provider with a "Use this" button. Nothing else changes.
 * Never put provider keys in the browser code.
 */
export type Network = "MTN" | "Airtel" | "Glo" | "9mobile";
export const NETWORKS: Network[] = ["MTN", "Airtel", "Glo", "9mobile"];

export interface DataPlan { code: string; name: string; validity: string; category: "daily" | "weekly" | "monthly"; cost: number }
export interface Disco { code: string; name: string }
export interface TvOperator { code: string; name: string; idType?: "card" | "phone" } // code is the provider's own id for the decoder company (dstv, gotv)
export interface TvBouquet { code: string; name: string; cost: number }
export interface ExamType { code: string; name: string; needsProfile?: boolean; single?: boolean; noFee?: boolean } // needsProfile: the buyer's ID must be checked first (JAMB). single: one per order. noFee: the owner's exam fee is not added (JAMB prices are fixed by JAMB).
export interface ExamProduct { code: string; name: string; cost: number }
export interface CardCheck { ok: boolean; name?: string; status?: string; dueDate?: string; message?: string }
export interface ExamPin { serial?: string; pin: string }
export type BuyStatus = "success" | "pending" | "failed";

export interface BuyRequest {
  reference: string; // our unique reference; the provider must never run the same reference twice
  requestId?: string; // the provider's own reference for this purchase, when the provider needs a special format (see makeRequestId)
  service: "airtime" | "data" | "electricity" | "tv" | "exam";
  network: string;
  phone?: string;
  planCode?: string;
  amount: number; // face value in naira (airtime and electricity)
  meter?: { number: string; type: "prepaid" | "postpaid" };
  card?: string; // tv: the smartcard / IUC number
  quantity?: number; // exam: how many pins
}
export interface BuyResult {
  status: BuyStatus; providerReference?: string; message?: string; token?: string; units?: string; cost?: number;
  pins?: ExamPin[]; // exam: the pins that were bought
  code?: string; // the provider's own result code, kept for the admin
  setupProblem?: boolean; // true when the refusal is OUR setup (empty provider wallet, wrong keys, IP not allowed), not the customer's fault
}
export type QueryResult = Omit<BuyResult, "status"> & { status: BuyStatus | "not_found" };

export interface VtuProvider {
  name: string;
  simulated: boolean; // true for the simulator and for a provider's test (sandbox) mode: nothing real is delivered
  requiresPhone?: boolean; // true if the provider needs a phone number even for electricity
  /** Providers with a strict reference format return the reference to send. The service saves it before buying and uses it to ask later. */
  makeRequestId?(reference: string): string;
  listDataPlans(network: string): Promise<DataPlan[]>;
  discos(): Promise<Disco[]>;
  verifyMeter(p: { disco: string; type: "prepaid" | "postpaid"; meter: string }): Promise<{ ok: boolean; name?: string; address?: string; message?: string; minAmount?: number }>;
  /** Optional products. A provider that does not sell them leaves these out and the shop hides them. */
  tvOperators?(): TvOperator[];
  tvBouquets?(operator: string): Promise<TvBouquet[]>;
  verifyCard?(p: { operator: string; card: string }): Promise<CardCheck>;
  examTypes?(): ExamType[];
  examProducts?(exam: string): Promise<ExamProduct[]>;
  verifyProfile?(p: { exam: string; product: string; profile: string }): Promise<CardCheck>;
  buy(req: BuyRequest): Promise<BuyResult>;
  query(reference: string, requestId?: string): Promise<QueryResult>;
}
