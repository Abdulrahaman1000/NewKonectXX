/**
 * Counter — atomic sequence generator.
 *
 * MongoDB's `findOneAndUpdate` with `$inc` is atomic, which means we can
 * safely increment a counter from many concurrent processes without
 * collisions. We use this for sequential order numbers.
 */

import { Schema, model, Document } from "mongoose";

export interface CounterDocument extends Document {
  _id: string; // counter name, e.g. "order:2026"
  seq: number;
}

const CounterSchema = new Schema<CounterDocument>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter = model<CounterDocument>("Counter", CounterSchema);

/**
 * Returns the next number in a named sequence, atomically.
 * Creates the counter if it doesn't exist.
 */
export async function nextSeq(name: string): Promise<number> {
  const result = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return result.seq;
}
