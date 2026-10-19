/**
 * Smart Combo's official delivery and payment policy, as told to customers by the AI.
 *
 * This REPLACES the delivery and payment text that used to be built from the site
 * settings, and it hides any older page text or FAQ that still says delivery is free
 * or quotes the old ₦3,500 fee, so the assistant never contradicts the policy.
 *
 * To change the policy later, edit the text below. Nothing else needs to change.
 */

import type { KDoc } from "./retrieve";

const DELIVERY_TEXT = [
  "Delivery in Ilorin (Kwara State): Smart Combo delivers Ilorin orders itself, not through Jumia.",
  "Delivery in Ilorin costs a flat ₦1,000, which is added to the order total at checkout.",
  "Cash on delivery is available in Ilorin only.",
  "Delivery in Ilorin usually takes 2–3 business days.",

  "Delivery outside Ilorin (all other states and the FCT): orders are delivered by Jumia.",
  "Smart Combo packs the order and drops it at a Jumia office, and Jumia delivers it to the customer.",
  "Smart Combo adds no delivery fee to the order on the website.",
  "Jumia sets the delivery fee for the customer's location, and the customer pays that fee directly to Jumia, not to Smart Combo.",
  "Delivery outside Ilorin usually takes about 4–7 business days after Smart Combo hands the order to Jumia, depending on location.",
  "Orders outside Ilorin must be paid online (Paystack) before dispatch, and cash on delivery is not available outside Ilorin.",

  "Other delivery points: Smart Combo delivers to all 36 states and the FCT.",
  "Orders are processed Monday to Saturday.",
  "Orders placed before 1:00 PM are usually dispatched the same day, and Sunday and public-holiday orders are processed the next business day.",
  "After dispatch the customer gets a tracking number by WhatsApp and email, and can also use the Order Tracking page.",
  "Delivery is never free: Smart Combo does not offer free delivery.",
  "Delivery times are estimates, not guarantees, and delays caused by Jumia or other couriers are outside Smart Combo's control.",
  "For the exact Jumia fee in their area, customers should chat with Smart Combo on WhatsApp, because Jumia sets that fee.",
].join(" ");

const PAYMENT_TEXT =
  "Payment options are shown at checkout; they include online payment through Paystack and bank transfer. " +
  "Bank transfer details are shown at checkout. " +
  "Cash on delivery is available in Ilorin only. " +
  "Orders outside Ilorin must be paid online before dispatch.";

export const DELIVERY_DOCS: KDoc[] = [
  {
    id: "policy:delivery",
    type: "policy",
    title: "Delivery policy: fees, delivery times, Jumia and cash on delivery",
    link: "/shipping",
    text: DELIVERY_TEXT,
  },
  {
    id: "policy:payment",
    type: "policy",
    title: "Payment",
    text: PAYMENT_TEXT,
  },
];

// Older page text or FAQs that still claim free delivery or the old fee
const OUTDATED = /free\s+(nationwide\s+)?(delivery|shipping)|3,?500/i;

let reported = false;

/**
 * Swaps in the official delivery and payment policy (in place) and hides
 * outdated text. Called once, right before the knowledge is cached.
 */
export function applyDeliveryPolicy(docs: KDoc[]): void {
  const hidden: string[] = [];

  for (let i = docs.length - 1; i >= 0; i--) {
    const d = docs[i];
    if (d.id === "policy:delivery" || d.id === "policy:payment") {
      docs.splice(i, 1);
    } else if ((d.id.startsWith("site:") || d.id.startsWith("faq:")) && OUTDATED.test(`${d.title} ${d.text}`)) {
      hidden.push(`${d.id} "${d.title.slice(0, 50)}"`);
      docs.splice(i, 1);
    }
  }

  docs.push(...DELIVERY_DOCS);

  if (hidden.length && !reported) {
    reported = true;
    console.warn(
      `[ai] hid ${hidden.length} page/FAQ entries that still say free delivery or ₦3,500. ` +
        `Update them on the site so the assistant can use them again:\n  ` +
        hidden.join("\n  "),
    );
  }
}
