/**
 * Admin chat API — requires admin login (token attached by apiFetch).
 */

import { apiFetch } from "./client";
import type { ChatMessage } from "./chat";

interface ApiResponse<T> {
  data: T;
}

export interface ChatListItem {
  id: string;
  name: string;
  phone: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadForAdmin: number;
}

export interface ChatThread {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  messages: ChatMessage[];
}

export async function listChats(): Promise<ChatListItem[]> {
  const res = await apiFetch<ApiResponse<ChatListItem[]>>("/api/admin/chats");
  return res.data;
}

export async function getChat(id: string): Promise<ChatThread> {
  const res = await apiFetch<ApiResponse<ChatThread>>(`/api/admin/chats/${id}`);
  return res.data;
}

export async function replyToChat(id: string, text: string): Promise<void> {
  await apiFetch(`/api/admin/chats/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function deleteChat(id: string): Promise<void> {
  await apiFetch(`/api/admin/chats/${id}`, { method: "DELETE" });
}

export async function getChatUnreadCount(): Promise<number> {
  const res = await apiFetch<ApiResponse<{ count: number }>>("/api/admin/chats/unread-count");
  return res.data.count;
}
