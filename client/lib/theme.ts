/**
 * Light / dark theme.
 *
 * - No account needed. The visitor's choice is saved in their own browser.
 * - "auto" (nothing saved) follows the phone or computer setting.
 * - Admin pages always stay dark.
 * - The mobile app (WebView) can switch it with:
 *     window.__scSetTheme('light' | 'dark' | 'auto')
 */
import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'sc-theme';
const EVENT = 'sc-theme-change';
const BROWSER_COLOR: Record<ResolvedTheme, string> = { light: '#FBF8F1', dark: '#0a0a0f' };
const isBrowser = typeof window !== 'undefined';

function isAdminPath(): boolean {
  return isBrowser && window.location.pathname.startsWith('/admin');
}

export function getChoice(): ThemeChoice {
  if (!isBrowser) return 'auto';
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage can be blocked */
  }
  return 'auto';
}

function systemTheme(): ResolvedTheme {
  if (!isBrowser || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function resolveTheme(): ResolvedTheme {
  if (isAdminPath()) return 'dark';
  const choice = getChoice();
  return choice === 'auto' ? systemTheme() : choice;
}

export function applyTheme(): ResolvedTheme {
  const resolved = resolveTheme();
  if (!isBrowser) return resolved;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BROWSER_COLOR[resolved]);
  return resolved;
}

export function setChoice(choice: ThemeChoice): void {
  try {
    if (choice === 'auto') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, choice);
  } catch {
    /* ignore */
  }
  applyTheme();
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  mq?.addEventListener?.('change', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
    mq?.removeEventListener?.('change', callback);
  };
}

export function useTheme() {
  const resolved = useSyncExternalStore(subscribe, resolveTheme, () => 'dark' as ResolvedTheme);
  return { resolved, choice: getChoice(), setChoice };
}

// ---- Runs once when the app loads ----
if (isBrowser && !(window as any).__scThemeReady) {
  (window as any).__scThemeReady = true;
  applyTheme();

  const refresh = () => {
    applyTheme();
    window.dispatchEvent(new Event(EVENT));
  };

  // Follow the device setting while the visitor has not chosen.
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', refresh);

  // Keep admin pages dark when moving between pages.
  (['pushState', 'replaceState'] as const).forEach((method) => {
    const original = window.history[method];
    window.history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args);
      refresh();
      return result;
    } as typeof original;
  });
  window.addEventListener('popstate', refresh);

  // Lets the mobile app switch the theme.
  (window as any).__scSetTheme = setChoice;
}
