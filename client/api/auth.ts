/**
 * Auth API — frontend client functions.  (SC-STAFF version)
 */
import { apiFetch } from "./client";
import { setToken, clearToken } from "@/lib/auth";

interface ApiResponse<T> {
  data: T;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "admin" | "staff";
  staffRole?: "packer" | "sales" | "content" | "bookkeeper" | "manager";
  /** ["*"] for the owner, otherwise the list for their role */
  permissions: string[];
  lastLoginAt?: string;
}

interface LoginResponse {
  token: string;
  user: AdminUser;
}

export async function login(email: string, password: string): Promise<AdminUser> {
  const res = await apiFetch<ApiResponse<LoginResponse>>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(res.data.token);
  return res.data.user;
}

export async function fetchCurrentUser(): Promise<AdminUser> {
  const res = await apiFetch<ApiResponse<AdminUser>>("/api/auth/me");
  return res.data;
}

export function logout(): void {
  clearToken();
}
