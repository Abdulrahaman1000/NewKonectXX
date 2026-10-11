/**
 * Customer chat API (no login). The conversation is identified by a secret
 * token kept in this browser's localStorage.
 */

import { apiFetch } from "./client";

export interface ChatMessage {
  id: string;
  sender: "customer" | "admin";
  text: string;
  createdAt: string;
}

interface ApiResponse<T> {
  data: T;
}

const TOKEN_KEY = "smartcombo:chatToken";

export function getChatToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function saveChatToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode: chat still works until the tab closes */
  }
}
export function clearChatToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function startChat(payload: {
  name: string;
  phone?: string;
  message: string;
}): Promise<{ token: string; messages: ChatMessage[] }> {
  const res = await apiFetch<ApiResponse<{ token: string; messages: ChatMessage[] }>>(
    "/api/chat/start",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function fetchChat(token: string): Promise<ChatMessage[]> {
  const res = await apiFetch<ApiResponse<{ messages: ChatMessage[] }>>(`/api/chat/${token}`);
  return res.data.messages;
}

export async function sendChatMessage(token: string, text: string): Promise<void> {
  await apiFetch(`/api/chat/${token}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function fetchChatUnread(token: string): Promise<number> {
  const res = await apiFetch<ApiResponse<{ unread: number }>>(`/api/chat/${token}/unread`);
  return res.data.unread;
}
