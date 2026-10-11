/**
 * ChatConversation model — one document per customer chat.
 *
 * Customers don't log in. When they start a chat we create a long random
 * `token` and the browser keeps it, so only that browser can read or add to
 * the conversation. Messages are stored inside the document.
 */

import { Schema, model, Document } from "mongoose";

export interface ChatMessageDoc {
  _id?: any;
  sender: "customer" | "admin";
  text: string;
  createdAt: Date;
}

export interface ChatConversationDocument extends Document {
  token: string;
  name: string;
  phone: string;
  messages: ChatMessageDoc[];
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadForAdmin: number;
  unreadForCustomer: number;
  lastAdminAlertAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema(
  {
    sender: { type: String, enum: ["customer", "admin"], required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const ChatConversationSchema = new Schema<ChatConversationDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, default: "", trim: true, maxlength: 30 },
    messages: { type: [MessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: "" },
    unreadForAdmin: { type: Number, default: 0 },
    unreadForCustomer: { type: Number, default: 0 },
    lastAdminAlertAt: { type: Date },
  },
  { timestamps: true },
);

export const ChatConversation = model<ChatConversationDocument>(
  "ChatConversation",
  ChatConversationSchema,
);
