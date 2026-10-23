/** SC-STAFF SC-STAFF3  Staff accounts and audit log API (owner only). */
import { apiFetch } from "./client";

export type StaffRole = "packer" | "sales" | "content" | "bookkeeper" | "manager";

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  packer: "Packer / dispatch",
  sales: "Sales assistant (WhatsApp)",
  content: "Content / marketing",
  bookkeeper: "Bookkeeper",
  manager: "Manager",
};

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  staffRole: StaffRole;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuditRow {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  method: string;
  path: string;
  status: number;
  detail?: string;
  createdAt: string;
}

export const listStaff = () =>
  apiFetch<{ data: StaffMember[] }>("/api/admin/staff").then((r) => r.data);

export const createStaff = (body: { name: string; email: string; staffRole: StaffRole; password: string }) =>
  apiFetch<{ data: StaffMember }>("/api/admin/staff", { method: "POST", body: JSON.stringify(body) }).then((r) => r.data);

export const updateStaff = (id: string, body: Partial<Pick<StaffMember, "name" | "staffRole" | "active">>) =>
  apiFetch<{ data: StaffMember }>(`/api/admin/staff/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then((r) => r.data);

export const resetStaffPassword = (id: string, password: string) =>
  apiFetch<{ data: { ok: boolean } }>(`/api/admin/staff/${id}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });

export const listAudit = (userId?: string) =>
  apiFetch<{ data: AuditRow[] }>(`/api/admin/audit${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`).then((r) => r.data);
