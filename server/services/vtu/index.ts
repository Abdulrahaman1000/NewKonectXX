/**
 * SC-PROV  The list of providers and which ones are ready.
 *
 * A provider is "ready" when its keys are in the server .env:
 *   VTpass        VTPASS_API_KEY, VTPASS_PUBLIC_KEY, VTPASS_SECRET_KEY, VTPASS_ENV=sandbox (test) or live
 *   Legitdataway  LEGIT_TOKEN  (or LEGIT_USERNAME and LEGIT_PASSWORD)
 *   Simulator     pretend provider for testing; on the live site it is hidden unless VTU_ALLOW_SIMULATOR=yes
 * The owner chooses which ready provider is used in Admin > VTU > Provider. Until one is chosen, VTU_PROVIDER (old setting) is used if present.
 * With nothing chosen and no VTU_PROVIDER, recharge stays switched off.
 */
import type { VtuProvider } from "./provider";
import { SimulatorProvider } from "./simulator";
import { LegitdatawayProvider } from "./legitdataway"; // SC-LEGIT
import { VtpassProvider, vtpassConfigured, vtpassSandbox } from "./vtpass"; // SC-PROV

export const PROVIDER_NAMES = ["vtpass", "legitdataway", "simulator"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

const env = (k: string) => String(process.env[k] ?? "").trim();
const isProd = () => process.env.NODE_ENV === "production";
const testModeAllowed = () => !isProd() || env("VTU_ALLOW_SIMULATOR") === "yes";

const INFO: Record<ProviderName, { label: string; configured: () => boolean; hint: string }> = {
  vtpass: {
    label: "VTpass", configured: () => vtpassConfigured() && (!vtpassSandbox() || testModeAllowed()),
    hint: "Needs VTPASS_API_KEY, VTPASS_PUBLIC_KEY and VTPASS_SECRET_KEY in the server settings. VTPASS_ENV=live for real sales.",
  },
  legitdataway: { label: "Legitdataway", configured: () => env("ENABLE_LEGITDATAWAY") === "yes" && Boolean(env("LEGIT_TOKEN") || (env("LEGIT_USERNAME") && env("LEGIT_PASSWORD"))), hint: "Needs LEGIT_TOKEN in the server settings." },
  simulator: { label: "Simulator (testing only)", configured: () => env("ENABLE_SIMULATOR") === "yes" && testModeAllowed(), hint: "Pretend provider. Hidden on the live site." },
};

const made: Partial<Record<ProviderName, VtuProvider>> = {};

/** A ready provider by name, or null if it is unknown, its keys are missing, or it is a test mode that must not run on the live site. */
export function providerByName(name: string | null | undefined): VtuProvider | null {
  const n = String(name ?? "").trim().toLowerCase() as ProviderName;
  if (!PROVIDER_NAMES.includes(n) || !INFO[n].configured()) return null;
  if (n === "simulator") return (made.simulator ??= new SimulatorProvider());
  if (n === "legitdataway") return (made.legitdataway ??= new LegitdatawayProvider());
  return (made.vtpass ??= new VtpassProvider());
}

/** The provider named in the old VTU_PROVIDER setting (used until the owner picks one in Admin). */
export function defaultProviderName(): string {
  const n = env("VTU_PROVIDER").toLowerCase();
  return providerByName(n) ? n : "";
}

export function getProvider(): VtuProvider | null { return providerByName(defaultProviderName()); }

export function listProviders() {
  return PROVIDER_NAMES.map((name) => {
    const ready = INFO[name].configured();
    const p = ready ? providerByName(name) : null;
    return { name, label: INFO[name].label, ready, testMode: Boolean(p?.simulated), hint: INFO[name].hint };
  }).filter((x) => x.name !== "simulator" || x.ready);
}
