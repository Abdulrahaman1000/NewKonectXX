/**
 * SC-VTU  Picks the provider. VTU_PROVIDER in the server .env:
 *   (empty or "off")  VTU is switched off; the Pay page says "coming soon".
 *   simulator         pretend provider. On the live site it is ignored unless VTU_ALLOW_SIMULATOR=yes.
 *   legitdataway      Legitdataway (needs LEGIT_TOKEN, see legitdataway.ts).
 */
import type { VtuProvider } from "./provider";
import { SimulatorProvider } from "./simulator";
import { LegitdatawayProvider } from "./legitdataway"; // SC-LEGIT

let sim: SimulatorProvider | null = null;
let legit: LegitdatawayProvider | null = null;

export function getProvider(): VtuProvider | null {
  const name = String(process.env.VTU_PROVIDER ?? "").trim().toLowerCase();
  if (name === "simulator") {
    if (process.env.NODE_ENV === "production" && process.env.VTU_ALLOW_SIMULATOR !== "yes") return null;
    return (sim ??= new SimulatorProvider());
  }
  if (name === "legitdataway") return (legit ??= new LegitdatawayProvider()); // SC-LEGIT
  return null;
}
