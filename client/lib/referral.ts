/**
 * Remembers a Reseller's referral code from a link like https://yoursite.com/?ref=SC1001
 * Destination: client/lib/referral.ts
 *
 * captureReferral()  -> call once when the app starts
 * getReferral()      -> call at checkout; returns the code or undefined
 * The newest link wins and the code is kept for 30 days.
 */

const KEY = 'smartcombo_ref';
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_RE = /^SC\d{4,8}$/;

export function captureReferral(): void {
  try {
    const raw = new URLSearchParams(window.location.search).get('ref');
    const code = raw?.trim().toUpperCase();
    if (code && CODE_RE.test(code)) {
      localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
    }
  } catch {
    /* storage blocked: the sale just won't be attributed */
  }
}

export function getReferral(): string | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const { code, at } = JSON.parse(raw);
    if (typeof code !== 'string' || Date.now() - Number(at) > WINDOW_MS) {
      localStorage.removeItem(KEY);
      return undefined;
    }
    return code;
  } catch {
    return undefined;
  }
}
