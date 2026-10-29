/**
 * SC-VTU  Picks the provider. VTU_PROVIDER in the server .env:
 *   (empty or "off")  VTU is switched off; the Pay page says "coming soon".
 *   simulator         pretend provider. Allowed on a laptop. On the live site it is ignored unless VTU_ALLOW_SIMULATOR=yes,
 *                     so the live site can never "sell" airtime that is not delivered.
 *   <real provider>   add its file in this folder and a line below.
 */
import type { VtuProvider } from "./provider";
import { SimulatorProvider } from "./simulator";

let sim: SimulatorProvider | null = null;

export function getProvider(): VtuProvider | null {
  const name = String(process.env.VTU_PROVIDER ?? "").trim().toLowerCase();
  if (name === "simulator") {
    if (process.env.NODE_ENV === "production" && process.env.VTU_ALLOW_SIMULATOR !== "yes") return null;
    return (sim ??= new SimulatorProvider());
  }
  // if (name === "clickpay") return new ClickPayProvider();   // <- add real providers here
  return null;
}
