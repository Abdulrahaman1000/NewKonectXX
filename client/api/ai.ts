/**
 * AI assistant API. Nothing is stored on the server; the browser sends the
 * last few messages with each question.
 */

import { apiFetch } from "./client";

export interface AISource {
  id: string;
  title: string;
  link: string | null;
}

export interface AIReply {
  answer: string;
  sources: AISource[];
  needsHuman: boolean;
  /** "direct" = built from our own pages because the AI was unavailable */
  mode?: "ai" | "direct";
}

export interface AITurn {
  role: "user" | "assistant";
  text: string;
}

export async function askAI(messages: AITurn[]): Promise<AIReply> {
  const res = await apiFetch<{ data: AIReply }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
  return res.data;
}
