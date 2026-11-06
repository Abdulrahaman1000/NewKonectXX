/** SC-ACCT  The signed-in customer's token. Kept apart from the admin token on purpose.
 *  SC-NAV   Also remembers where to send the customer after they sign in, and a half-filled Pay form. */
const KEY = "sc_customer_token";
export const getCustomerToken = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
export const setCustomerToken = (t: string) => {
  try { localStorage.setItem(KEY, t); } catch { /* private window: the sign-in lasts until the page closes */ }
};
export const clearCustomerToken = () => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};

/** Where to go after signing in. Lasts 30 minutes, used once. Only paths on this site. */
const RET = "sc_return_to";
export const setReturnTo = (path: string) => {
  try { if (path.startsWith("/") && !path.startsWith("//")) sessionStorage.setItem(RET, JSON.stringify({ path, at: Date.now() })); } catch { /* ignore */ }
};
export const takeReturnTo = (): string | null => {
  try {
    const raw = sessionStorage.getItem(RET); sessionStorage.removeItem(RET);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v?.path === "string" && v.path.startsWith("/") && !v.path.startsWith("//") && Date.now() - Number(v.at) < 30 * 60_000 ? v.path : null;
  } catch { return null; }
};

/** A half-filled Pay form, kept while the customer signs in or tops up, then put back. */
const DRAFT = "sc_pay_draft";
export const savePayDraft = (d: Record<string, unknown>) => { try { sessionStorage.setItem(DRAFT, JSON.stringify({ d, at: Date.now() })); } catch { /* ignore */ } };
export const takePayDraft = (): Record<string, any> | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT); sessionStorage.removeItem(DRAFT);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.d === "object" && Date.now() - Number(v.at) < 60 * 60_000 ? v.d : null;
  } catch { return null; }
};
