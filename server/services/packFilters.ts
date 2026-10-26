/**
 * The two questions the dashboard, the daily summary and Fulfilment all ask:
 *  - what can be packed right now?
 *  - what are we still waiting for goods on?
 *
 * Orders that wait for pre-order goods are NOT ready to pack.
 * Orders sent in parts are ready to pack when a part is ready (to pack or packed).
 */

/** Paid pre-order orders whose goods you still have to buy (the To get list). */
export const WAITING_GOODS = { awaitingGoods: true, status: { $in: ["paid", "processing"] } };

/** Orders (or parts of orders) that can be packed now. */
export const PACK_NOW = {
  $or: [
    {
      awaitingGoods: { $ne: true },
      partialChoice: { $ne: "now" },
      $or: [{ status: { $in: ["paid", "processing"] } }, { status: "pending", paymentMethod: "cod" }],
    },
    {
      partialChoice: "now",
      status: { $in: ["paid", "processing"] },
      "shipments.status": { $in: ["to_pack", "packed"] },
    },
  ],
};
