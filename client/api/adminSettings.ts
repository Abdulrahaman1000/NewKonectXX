/**
 * Admin site settings API — frontend client.
 */

import { apiFetch } from "./client";

interface ApiResponse<T> { data: T; }

export interface AdminSiteSettings {
  storeName: string;
  tagline: string;
  defaultHeroImage: string;
  promo: {
    endsAt: string;     // ISO date string
    enabled: boolean;
    headline: string;
    subline: string;
  };
  contact: {
    whatsappNumber: string;
    email: string;
    phone: string;
    address: string;
  };
  video: {
    url: string;
    thumbnail: string;
    title: string;
    duration: string;
  };
  trustStats: {
    rating: number;
    reviewCount: number;
  };
  bankAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  shipping: {
    standardFee: number;
    codCities: string[];
    freeShippingThreshold: number;
  };
}

export async function getAdminSettings(): Promise<AdminSiteSettings> {
  const res = await apiFetch<ApiResponse<AdminSiteSettings>>("/api/admin/settings");
  return res.data;
}

export async function updateAdminSettings(
  payload: Partial<AdminSiteSettings>,
): Promise<AdminSiteSettings> {
  const res = await apiFetch<ApiResponse<AdminSiteSettings>>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}
