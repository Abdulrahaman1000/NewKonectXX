/**
 * Admin orders API — frontend client.
 *
 * All requests go through apiFetch, which automatically attaches the
 * admin JWT from localStorage. If the token is invalid/expired,
 * apiFetch will throw a 401, AdminProtectedRoute redirects to login.
 */

import { apiFetch } from "./client";
import type { Order, OrderStatus } from "@/types/order";

interface ListResponse {
  data: Order[];
  meta: { total: number; page: number; limit: number; pages: number };
}

interface ItemResponse {
  data: Order;
}

interface StatsResponse {
  data: {
    ordersToday: number;
    revenueToday: number;
    pendingOrders: number;
    customers: number;
    recentOrders: Pick<
      Order,
      "_id" | "orderNumber" | "status" | "total" | "createdAt"
    > &
      { shipping: { fullName: string } }[];
  };
}

export interface ListOrdersParams {
  status?: OrderStatus | "all";
  search?: string;
  page?: number;
  limit?: number;
}

export async function listOrders(
  params: ListOrdersParams = {},
): Promise<ListResponse> {
  const qs = new URLSearchParams();
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const query = qs.toString();
  return apiFetch<ListResponse>(
    `/api/admin/orders${query ? `?${query}` : ""}`,
  );
}

export async function getOrder(id: string): Promise<Order> {
  const res = await apiFetch<ItemResponse>(`/api/admin/orders/${id}`);
  return res.data;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order> {
  const res = await apiFetch<ItemResponse>(`/api/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export async function updateOrder(
  id: string,
  payload: { trackingUrl?: string; adminNotes?: string },
): Promise<Order> {
  const res = await apiFetch<ItemResponse>(`/api/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getDashboardStats() {
  const res = await apiFetch<StatsResponse>("/api/admin/dashboard/stats");
  return res.data;
}
