/**
 * Remembers a partner's referral code from a link like https://yoursite.com/?ref=SC1001
 * Destination: client/lib/referral.ts
 *
 * captureReferral()  -> call once when the app starts. Also counts the visit as a click
 *                       (once per code per day per browser, so refreshing does not inflate it).
 * getReferral()      -> call at checkout; returns the code or undefined
 * The newest link wins and the code is kept for 30 days.
 */

const KEY = 'smartcombo_ref';
const CLICK_KEY = 'smartcombo_ref_click';
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CODE_RE = /^SC\d{4,8}$/;

function trackClick(code: string): void {
  try {
    const last = JSON.parse(localStorage.getItem(CLICK_KEY) || '{}');
    if (last.code === code && Date.now() - Number(last.at) < DAY_MS) return;
    localStorage.setItem(CLICK_KEY, JSON.stringify({ code, at: Date.now() }));
    fetch('/api/partner/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: code }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function captureReferral(): void {
  try {
    const raw = new URLSearchParams(window.location.search).get('ref');
    const code = raw?.trim().toUpperCase();
    if (code && CODE_RE.test(code)) {
      localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
      trackClick(code);
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
