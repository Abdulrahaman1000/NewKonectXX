/**
 * Base API client.
 *
 * Wraps fetch() with consistent error handling AND automatic JWT attachment.
 *
 * If a token exists in localStorage (admin is logged in), it's added to every
 * request as `Authorization: Bearer <token>`. This is harmless for public
 * endpoints (they ignore the header) and required for admin endpoints.
 *
 * On 401 responses (token expired/invalid), automatically clears the stored
 * token so the user gets redirected to login on next protected route.
 */

import { getToken, clearToken } from "@/lib/auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body?.error?.message || body?.message || message;
      code = body?.error?.code;
    } catch {
      // ignore JSON parse errors
    }

    // Auto-clear stale tokens on auth errors
    if (res.status === 401 && token) {
      clearToken();
    }

    throw new ApiError(res.status, message, code);
  }

  return res.json();
}
