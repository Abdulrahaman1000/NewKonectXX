/** SC-INAPP  True when the site is opened inside the Smart Combo phone app (the app adds "SmartComboApp" to the browser name). */
export function isInApp(): boolean {
  try {
    if (typeof navigator !== 'undefined' && /SmartComboApp/i.test(navigator.userAgent)) return true;
    if (typeof window !== 'undefined' && (window as any).__SC_APP__ === true) return true;
  } catch { /* ignore */ }
  return false;
}
