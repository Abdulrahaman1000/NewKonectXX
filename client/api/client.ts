/**
 * Base API client.
 *
 * Wraps fetch() with consistent error handling.
 * For now most endpoints aren't real — see api/combos.ts etc.
 *
 * When backend is ready, set VITE_API_URL in .env to point to your API
 * (or leave empty to use same-origin /api/* — which works because the
 * Express server is integrated into Vite).
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}
