/** One row per day the morning summary was claimed, so a restart never sends it twice. _id is the Lagos date, e.g. "2026-10-22". */
import { Schema, model } from "mongoose";

const SummaryLogSchema = new Schema({ _id: { type: String }, sentAt: { type: Date, default: Date.now } });
export const SummaryLog = model("SummaryLog", SummaryLogSchema);
