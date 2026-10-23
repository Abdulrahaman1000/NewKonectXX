/** SC-STAFF3  Turns a logged request (method + path) into a plain sentence for the Activity log. */
const RULES: Array<[string, RegExp, string]> = [
  ['POST', /^orders\/manual$/, 'Recorded a sale'],
  ['PATCH', /^orders\/:id\/status$/, "Changed an order's status"],
  ['PATCH', /^orders\/:id$/, "Updated an order's tracking or notes"],
  ['POST', /^fulfilment\/:id\/packed$/, 'Marked an order as packed'],
  ['POST', /^fulfilment\/:id\/ship$/, 'Marked an order as shipped / out for delivery'],
  ['POST', /^fulfilment\/:id\/delivered$/, 'Marked an order as delivered'],
  ['POST', /^stock\/:id\/restock$/, 'Added stock'],
  ['POST', /^stock\/:id\/set$/, 'Set a stock count'],
  ['POST', /^combos$/, 'Added a product'],
  ['PATCH', /^combos\/:id$/, 'Edited a product'],
  ['DELETE', /^combos\/:id$/, 'Deleted a product'],
  ['POST', /^(bookkeeping|profit)\/expenses$/, 'Added an expense'],
  ['DELETE', /^(bookkeeping|profit)\/expenses\/:id$/, 'Deleted an expense'],
  ['POST', /^profit\/recalculate$/, 'Recalculated order costs'],
  ['POST', /^staff$/, 'Created a staff account'],
  ['PATCH', /^staff\/:id$/, 'Changed a staff account (role or on/off)'],
  ['POST', /^staff\/:id\/password$/, 'Reset a staff password'],
  ['*', /^withdrawals/, 'Updated a partner payout'],
  ['*', /^resellers/, 'Updated a partner'],
  ['*', /^commissions/, 'Updated a commission'],
  ['*', /^settings/, 'Changed site settings'],
  ['*', /^hero-slides/, 'Changed hero slides'],
  ['*', /^testimonials/, 'Changed testimonials'],
  ['*', /^faqs/, 'Changed FAQs'],
  ['*', /^ads/, 'Changed partner ads'],
  ['*', /^categories/, 'Changed categories'],
  ['*', /^gifts/, 'Changed the gift bank'],
  ['*', /^chats/, 'Replied in customer chats'],
];

export function describeAction(method: string, fullPath: string): string {
  const p = fullPath
    .replace(/^\/api\/admin\//, '')
    .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id');
  for (const [m, re, text] of RULES) {
    if ((m === '*' || m === method) && re.test(p)) return text;
  }
  const area = p.split('/')[0] || 'admin';
  return `${method === 'DELETE' ? 'Deleted in' : method === 'POST' ? 'Added or ran in' : 'Changed'} ${area}`;
}
