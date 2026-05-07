/**
 * Categories API — frontend client.
 *
 * Public reads + admin CRUD.
 */

import { apiFetch } from "./client";
import type { Category } from "@/types/category";

interface ApiResponse<T> {
  data: T;
}

interface BackendCategory extends Omit<Category, "id"> {
  _id: string;
}

function normalize(raw: BackendCategory): Category {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

// ---- Public ----

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch<ApiResponse<BackendCategory[]>>("/api/categories");
  return res.data.map(normalize);
}

export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const res = await apiFetch<ApiResponse<BackendCategory>>(`/api/categories/${slug}`);
    return normalize(res.data);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

// ---- Admin ----

export async function listCategoriesAdmin(): Promise<Category[]> {
  const res = await apiFetch<ApiResponse<BackendCategory[]>>("/api/admin/categories");
  return res.data.map(normalize);
}

export async function createCategory(payload: {
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<Category> {
  const res = await apiFetch<ApiResponse<BackendCategory>>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function updateCategory(
  id: string,
  payload: Partial<{
    slug: string;
    name: string;
    icon: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
  }>,
): Promise<Category> {
  const res = await apiFetch<ApiResponse<BackendCategory>>(`/api/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalize(res.data);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
}
