/**
 * Auth utility — manages the JWT token in localStorage.
 *
 * Why localStorage and not cookies?
 * For this admin-only login (single user, no critical XSS surface), localStorage
 * is simpler. If we add customer accounts later, we'll move to httpOnly cookies.
 *
 * Functions:
 *  - getToken() → current token or null
 *  - setToken(token) → save token after login
 *  - clearToken() → remove on logout
 *  - isAuthenticated() → quick boolean check (does NOT verify with server)
 */

const TOKEN_KEY = "smartcombo_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
