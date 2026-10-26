/**
 * Phase 1 of Bulk orders: bulk price levels, bulk delivery fee, margin warning.
 * Run from the project root:  node .\patch-bulk.mjs
 * Safe to run twice. Nothing is written unless EVERY edit can be placed exactly.
 * Each changed file gets a .bak-bulk copy first.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
if (!fs.existsSync(path.join(root, "server", "index.ts")) || !fs.existsSync(path.join(root, "client"))) {
  console.error("Run this from the project folder (the one that has the server and client folders).");
  process.exit(1);
}

// ---------- new files (copied as they are) ----------
const NEW_FILES = [
  "server/services/bulkPricing.ts",
  "client/lib/bulk.ts",
  "client/components/BulkBox.tsx",
  "client/components/BulkPricesEditor.tsx",
];

// ---------- edits: [file, marker, [[anchor, replacement], ...]] ----------
const EDITS = [
  ["server/models/Combo.ts", "bulkTiers", [
    ["export interface ComboDocument extends Document {",
`/** "From minQty pieces, each one costs unitPrice" (a bulk price level). */
export interface BulkTier {
  minQty: number;
  unitPrice: number;
}

export interface ComboDocument extends Document {`],
    ["  stockLeft: number;\n  isFeatured: boolean;",
`  stockLeft: number;
  /** Bulk price levels, smallest quantity first. Empty = no bulk prices. */
  bulkTiers?: BulkTier[];
  isFeatured: boolean;`],
    ["const ComboSchema = new Schema<ComboDocument>(",
`const BulkTierSchema = new Schema<BulkTier>(
  {
    minQty: { type: Number, required: true, min: 2 },
    unitPrice: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const ComboSchema = new Schema<ComboDocument>(`],
    ["    stockLeft: { type: Number, default: 0, min: 0 },",
`    stockLeft: { type: Number, default: 0, min: 0 },
    bulkTiers: { type: [BulkTierSchema], default: [] },`],
  ]],

  ["server/models/Order.ts", "isBulk", [
    ["  manual?: boolean;\n  paystackRefs?: string[];",
`  manual?: boolean;
  /** true when the order reaches a bulk price level (flat bulk delivery, paid online) */
  isBulk?: boolean;
  paystackRefs?: string[];`],
    ["    manual: { type: Boolean, default: false },",
`    manual: { type: Boolean, default: false },
    isBulk: { type: Boolean, default: false },`],
  ]],

  ["server/routes/admin/combos.ts", "cleanTiers", [
    ["/** Staff never see or send cost prices",
`/** Bulk price levels: whole numbers only, quantity 2 or more, sorted, one row per quantity. */
function cleanTiers(raw: any): Array<{ minQty: number; unitPrice: number }> {
  if (!Array.isArray(raw)) return [];
  const byQty = new Map<number, number>();
  for (const t of raw) {
    const minQty = Math.floor(Number(t?.minQty));
    const unitPrice = Math.floor(Number(t?.unitPrice));
    if (Number.isFinite(minQty) && minQty >= 2 && Number.isFinite(unitPrice) && unitPrice > 0) byQty.set(minQty, unitPrice);
  }
  return [...byQty.entries()].sort((a, b) => a[0] - b[0]).map(([minQty, unitPrice]) => ({ minQty, unitPrice }));
}

/** Only the owner sets bulk prices. */
function isOwnerReq(req: Request): boolean {
  const perms: string[] = (req as any).user?.permissions || [];
  return perms.includes("*");
}

/** Staff never see or send cost prices`],
    ["      customComboEligible: Boolean(body.customComboEligible),\n      items: ensureItemIds(body.items),",
`      customComboEligible: Boolean(body.customComboEligible),
      bulkTiers: isOwnerReq(req) ? cleanTiers(body.bulkTiers) : [],
      items: ensureItemIds(body.items),`],
    ["    if (body.heroImage !== undefined) update.heroImage = body.heroImage;",
`    if (body.heroImage !== undefined) update.heroImage = body.heroImage;
    if (Array.isArray(body.bulkTiers) && isOwnerReq(req)) update.bulkTiers = cleanTiers(body.bulkTiers);`],
  ]],

  ["server/services/orderService.ts", "bulkPricing", [
    ['import { recordOrderCost } from "./costService";',
`import { recordOrderCost } from "./costService";
import { BULK_DELIVERY_FEE, BULK_MAX_QTY, maxQtyFor, orderHasBulk, unitPriceFor } from "./bulkPricing";`],
    ["paidSubtotal += combo.totalPrice * cartItem.quantity;",
     "paidSubtotal += unitPriceFor(combo, cartItem.quantity) * cartItem.quantity;"],
    ["cartItem.quantity < 1 || cartItem.quantity > 20) {",
     "cartItem.quantity < 1 || cartItem.quantity > BULK_MAX_QTY) {"],
    ['throw new OrderError(400, "INVALID_ITEM", "Item quantity must be a whole number from 1 to 20");',
     'throw new OrderError(400, "INVALID_ITEM", "Item quantity must be a whole number of 1 or more");'],
    ["    if (combo.stockLeft < cartItem.quantity) {",
`    if (cartItem.quantity > maxQtyFor(combo)) {
      throw new OrderError(
        400,
        "INVALID_ITEM",
        \`You can order up to \${maxQtyFor(combo)} of \${combo.name} at a time\`,
      );
    }
    if (combo.stockLeft < cartItem.quantity) {`],
    ["    const unitPrice = isFree ? 0 : combo.totalPrice;",
     "    const unitPrice = isFree ? 0 : unitPriceFor(combo, cartItem.quantity);"],
    ["  const shippingFee = manual?.pickup\n    ? 0\n    : await calculateShippingFee(\n        input.paymentMethod,\n        input.shipping.city,\n      );",
`  // Bulk orders: one flat Ilorin delivery fee for the whole order, and they must be paid online.
  const bulk = await orderHasBulk(input.items);
  if (bulk && !manual && input.paymentMethod !== "paystack") {
    throw new OrderError(400, "BULK_PAY_ONLINE", "Bulk orders must be paid online. Please choose Pay online.");
  }
  const baseFee = manual?.pickup
    ? 0
    : await calculateShippingFee(
        input.paymentMethod,
        input.shipping.city,
      );
  const shippingFee = bulk && baseFee > 0 ? BULK_DELIVERY_FEE : baseFee;`],
    ["      shippingFee,\n      total,\n      status: initialStatus,",
     "      shippingFee,\n      total,\n      isBulk: bulk,\n      status: initialStatus,"],
  ]],

  ["client/stores/cart.ts", "repriceLine", [
    ["import type { Combo } from '@/types/combo';",
`import type { Combo } from '@/types/combo';
import { priceForQty, repriceLine, tiersOf } from '@/lib/bulk';`],
    ["                ? {\n                    ...i,\n                    quantity: i.quantity + quantity,\n                    selectedVariants: selectedVariants ?? i.selectedVariants,\n                  }",
`                ? {
                    ...i,
                    quantity: i.quantity + quantity,
                    unitPrice: priceForQty(combo.totalPrice, tiersOf(combo), i.quantity + quantity),
                    ...({ bulkTiers: tiersOf(combo), basePrice: combo.totalPrice } as object),
                    selectedVariants: selectedVariants ?? i.selectedVariants,
                  }`],
    ["                unitPrice: combo.totalPrice,\n                originalPrice: combo.originalPrice,\n                quantity,",
`                unitPrice: priceForQty(combo.totalPrice, tiersOf(combo), quantity),
                originalPrice: combo.originalPrice,
                quantity,
                ...({ bulkTiers: tiersOf(combo), basePrice: combo.totalPrice } as object),`],
    ["            ? { ...i, quantity }\n",
     "            ? { ...i, quantity, unitPrice: repriceLine(i, quantity) }\n"],
  ]],

  ["client/pages/Checkout.tsx", "lineIsBulk", [
    ["import { formatNaira } from '@/lib/format';",
`import { formatNaira } from '@/lib/format';
import { BULK_DELIVERY_FEE, lineIsBulk } from '@/lib/bulk';`],
    ["  const estimatedShipping = isCodEligible ? LOCAL_DELIVERY_FEE : 0;",
`  // Bulk orders: one flat delivery fee for the whole order, and they must be paid online.
  const hasBulk = items.some((i) => lineIsBulk(i));
  const localFee = hasBulk ? BULK_DELIVERY_FEE : LOCAL_DELIVERY_FEE;
  const estimatedShipping = isCodEligible ? localFee : 0;
  useEffect(() => {
    if (hasBulk) setPaymentMethod('paystack');
  }, [hasBulk]);`],
    ["{isCodEligible && (", "{isCodEligible && !hasBulk && ("],
    ['                    title="Direct bank transfer"', '                    disabled={hasBulk}\n                    title="Direct bank transfer"'],
    ['                    title="Pay via WhatsApp"', '                    disabled={hasBulk}\n                    title="Pay via WhatsApp"'],
    ["                    disabled={!isCodEligible}", "                    disabled={!isCodEligible || hasBulk}"],
    ["                      isCodEligible\n                        ? `Pay when delivered.",
     "                      hasBulk\n                        ? 'Not available for bulk orders. Please pay online.'\n                        : isCodEligible\n                        ? `Pay when delivered."],
    ["{deliveredByJumiaElsewhere && (",
`{hasBulk && isCodEligible && (
                  <p className="text-[11px] leading-relaxed text-white/45">
                    Bulk delivery in Ilorin is {formatNaira(BULK_DELIVERY_FEE)} for your whole order. Bulk orders are paid online.
                  </p>
                )}
                {deliveredByJumiaElsewhere && (`],
    ['<p className="text-[10px] text-white/40">Qty {item.quantity}</p>',
     "<p className=\"text-[10px] text-white/40\">Qty {item.quantity}{!item.isFreeGift && item.quantity > 1 ? ' at ' + formatNaira(item.unitPrice) + ' each' : ''}</p>"],
    ["label={isCodEligible ? 'Delivery' : 'Delivery (Jumia)'}",
     "label={isCodEligible ? (hasBulk ? 'Bulk delivery' : 'Delivery') : 'Delivery (Jumia)'}"],
  ]],

  ["client/pages/ComboDetail.tsx", "BulkBox", [
    ["import { MobileComboDetail } from '@/components/MobileComboDetail';",
`import { MobileComboDetail } from '@/components/MobileComboDetail';
import { BulkBox } from '@/components/BulkBox';`],
    ["  const handleAddToCart = () => {", "  const handleAddToCart = (qty?: unknown) => {"],
    ["    addItem(\n      combo,\n      1,\n",
     "    addItem(\n      combo,\n      typeof qty === 'number' && qty >= 1 ? Math.floor(qty) : 1,\n"],
    ["  onAddToCart: () => void;\n}) {", "  onAddToCart: (qty?: number) => void;\n}) {"],
    ["              onClick={onAddToCart}", "              onClick={() => onAddToCart()}"],
    ['          <div className="flex flex-col sm:flex-row gap-3 mt-5">',
     '          <BulkBox onAdd={(q) => onAddToCart(q)} />\n\n          <div className="flex flex-col sm:flex-row gap-3 mt-5">'],
  ]],

  ["client/components/MobileComboDetail.tsx", "BulkBox", [
    ["import { calculateSavings, formatNaira } from '@/lib/format';",
`import { calculateSavings, formatNaira } from '@/lib/format';
import { BulkBox } from '@/components/BulkBox';`],
    ["  onOrder?: () => void;", "  onOrder?: (qty?: number) => void;"],
    ["        {/* Delivery & returns */}",
`        <BulkBox combo={combo} onAdd={(q) => (onOrder ? onOrder(q) : openWhatsApp())} />

        {/* Delivery & returns */}`],
  ]],

  ["client/api/adminCombos.ts", "bulkTiers", [
    ["  customComboEligible: boolean;\n  items: Array<{",
     "  customComboEligible: boolean;\n  /** bulk price levels (owner only on the server) */\n  bulkTiers?: Array<{ minQty: number; unitPrice: number }>;\n  items: Array<{"],
  ]],

  ["client/pages/AdminComboEdit.tsx", "BulkPricesEditor", [
    ["import { useAuth } from '@/contexts/AuthContext';",
`import { useAuth } from '@/contexts/AuthContext';
import { BulkPricesEditor } from '@/components/BulkPricesEditor';`],
    ["  costPrice: number;\n  isFeatured: boolean;",
     "  costPrice: number;\n  bulkTiers: Array<{ minQty: number; unitPrice: number }>;\n  isFeatured: boolean;"],
    ["stockLeft: 0, costPrice: 0, isFeatured: false,", "stockLeft: 0, costPrice: 0, bulkTiers: [], isFeatured: false,"],
    ["    costPrice: (combo as any).costPrice ?? 0,\n    isFeatured: combo.isFeatured,",
`    costPrice: (combo as any).costPrice ?? 0,
    bulkTiers: ((combo as any).bulkTiers ?? []).map((t: any) => ({
      minQty: Number(t.minQty) || 0,
      unitPrice: Number(t.unitPrice) || 0,
    })),
    isFeatured: combo.isFeatured,`],
    ["    costPrice: form.costPrice || 0,\n    isFeatured: form.isFeatured,",
`    costPrice: form.costPrice || 0,
    bulkTiers: form.bulkTiers.filter((t) => t.minQty >= 2 && t.unitPrice > 0),
    isFeatured: form.isFeatured,`],
    ["    if (form.originalPrice < 0) return 'Original price cannot be negative';",
`    if (form.originalPrice < 0) return 'Original price cannot be negative';
    for (const [i, t] of form.bulkTiers.entries()) {
      if (t.minQty < 2) return \`Bulk price \${i + 1}: "From pieces" must be 2 or more\`;
      if (t.unitPrice <= 0) return \`Bulk price \${i + 1}: enter a price each\`;
      if (i > 0 && t.minQty <= form.bulkTiers[i - 1].minQty) return 'Bulk prices must go up in quantity, row by row';
    }`],
    ["          <CostSummary form={form} />\n        </Section>\n",
`          <CostSummary form={form} />
        </Section>

        <BulkPricesEditor
          tiers={form.bulkTiers}
          onChange={(t) => update('bulkTiers', t)}
          sellingPrice={form.totalPrice}
          cost={
            form.costPrice > 0
              ? form.costPrice
              : form.items.reduce(
                  (s, it) => s + Math.max(it.costPrice || 0, ...it.alternatives.map((a) => a.costPrice || it.costPrice || 0)),
                  0,
                )
          }
        />
`],
  ]],
];

// ---------- run ----------
const norm = (s) => s.replace(/\r\n/g, "\n");
const plan = [];
let problems = 0;

for (const [rel, marker, edits] of EDITS) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.error("MISSING file: " + rel); problems++; continue; }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let text = norm(raw);
  if (text.includes(marker)) { console.log("already patched: " + rel); continue; }
  for (const [anchor, replacement] of edits) {
    const a = norm(anchor);
    const count = text.split(a).length - 1;
    if (count !== 1) {
      console.error(`CANNOT PLACE in ${rel}: anchor found ${count} times:\n  ${a.split("\n")[0]}`);
      problems++;
      continue;
    }
    text = text.replace(a, () => norm(replacement));
  }
  plan.push({ rel, file, text, crlf });
}

if (problems > 0) {
  console.error("\nNothing was changed. Send this output to Claude.");
  process.exit(1);
}

for (const p of plan) {
  fs.copyFileSync(p.file, p.file + ".bak-bulk");
  fs.writeFileSync(p.file, p.crlf ? p.text.replace(/\n/g, "\r\n") : p.text, "utf8");
  console.log("patched: " + p.rel);
}
for (const rel of NEW_FILES) {
  const dest = path.join(root, rel);
  const src = path.join(here, "files", rel);
  if (!fs.existsSync(src)) {
    if (fs.existsSync(dest)) { console.log("already added: " + rel); continue; }
    console.error("MISSING from the zip: " + rel);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("added: " + rel);
}
// when the zip was copied into the project folder, tidy up the spare copy
if (path.resolve(here) === path.resolve(root)) {
  fs.rmSync(path.join(here, "files"), { recursive: true, force: true });
}
console.log("\nDone. Stop all node windows, then run one: npm run dev");
