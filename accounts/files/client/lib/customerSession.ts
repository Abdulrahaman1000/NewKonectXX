/** SC-ACCT  The signed-in customer's token. Kept apart from the admin token on purpose. */
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
