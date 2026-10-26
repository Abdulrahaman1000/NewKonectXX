/**
 * Phase 2 of Bulk orders: pre-order items.
 * Needs phase 1 (patch-bulk) installed first.
 * Run from the project root:  node .\patch-preorder.mjs
 * Safe to run twice. Nothing is written unless every required edit can be placed exactly.
 * Each changed file gets a .bak-preorder copy first.
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
if (!fs.existsSync(path.join(root, "server", "services", "bulkPricing.ts"))) {
  console.error("Install phase 1 first (node .\\patch-bulk.mjs), then run this again.");
  process.exit(1);
}

const NEW_FILES = [
  "server/routes/admin/toget.ts",
  "client/api/adminToGet.ts",
  "client/pages/AdminToGet.tsx",
  "client/lib/preorder.ts",
  "client/components/PreorderNotice.tsx",
  "client/components/PreorderEditor.tsx",
  "client/components/BulkBox.tsx", // replaced by a version that understands pre-order
];

// [file, marker, optional?, [[anchor, replacement], ...]]
const EDITS = [
  ["server/models/Combo.ts", "leadDaysMax", false, [
    ["  bulkTiers?: BulkTier[];",
`  bulkTiers?: BulkTier[];
  /** Pre-order: when on and there is no stock, customers can still order and pay; you buy it after payment. */
  preorder?: boolean;
  leadDaysMin?: number;
  leadDaysMax?: number;`],
    ["    bulkTiers: { type: [BulkTierSchema], default: [] },",
`    bulkTiers: { type: [BulkTierSchema], default: [] },
    preorder: { type: Boolean, default: false },
    leadDaysMin: { type: Number, default: 5, min: 1 },
    leadDaysMax: { type: Number, default: 10, min: 1 },`],
  ]],

  ["server/models/Order.ts", "awaitingGoods", false, [
    ["// identifies free gift items\n}",
`// identifies free gift items
  preorder?: boolean;                          // pre-order line: nothing was taken from stock
  leadDaysMin?: number;
  leadDaysMax?: number;
}`],
    ["    isFreeGift: { type: Boolean, default: false },",
`    isFreeGift: { type: Boolean, default: false },
    preorder: { type: Boolean, default: false },
    leadDaysMin: { type: Number },
    leadDaysMax: { type: Number },`],
    ["  isBulk?: boolean;",
`  isBulk?: boolean;
  /** the order has pre-order items */
  hasPreorder?: boolean;
  /** paid pre-order whose goods you have not got yet: kept out of the packing queue */
  awaitingGoods?: boolean;`],
    ["    isBulk: { type: Boolean, default: false },",
`    isBulk: { type: Boolean, default: false },
    hasPreorder: { type: Boolean, default: false },
    awaitingGoods: { type: Boolean, default: false, index: true },`],
  ]],

  ["server/routes/admin/combos.ts", "leadDaysMax", false, [
    ["/** Only the owner sets bulk prices. */",
`/** Pre-order settings: whole days, at least 1, first number not above the second. */
function cleanPreorder(body: any): { preorder: boolean; leadDaysMin: number; leadDaysMax: number } {
  let min = Math.floor(Number(body?.leadDaysMin)) || 5;
  let max = Math.floor(Number(body?.leadDaysMax)) || 10;
  min = Math.min(365, Math.max(1, min));
  max = Math.min(365, Math.max(1, max));
  if (min > max) [min, max] = [max, min];
  return { preorder: Boolean(body?.preorder), leadDaysMin: min, leadDaysMax: max };
}

/** Only the owner sets bulk prices. */`],
    ["      bulkTiers: isOwnerReq(req) ? cleanTiers(body.bulkTiers) : [],",
`      bulkTiers: isOwnerReq(req) ? cleanTiers(body.bulkTiers) : [],
      ...(isOwnerReq(req) ? cleanPreorder(body) : {}),`],
    ["    if (Array.isArray(body.bulkTiers) && isOwnerReq(req)) update.bulkTiers = cleanTiers(body.bulkTiers);",
`    if (Array.isArray(body.bulkTiers) && isOwnerReq(req)) update.bulkTiers = cleanTiers(body.bulkTiers);
    if (body.preorder !== undefined && isOwnerReq(req)) Object.assign(update, cleanPreorder(body));`],
  ]],

  ["server/services/orderService.ts", "PREORDER_ACK", false, [
    ["  paymentMethod: PaymentMethod;\n  notes?: string;\n}",
`  paymentMethod: PaymentMethod;
  notes?: string;
  /** the customer ticked "I understand some items are pre-order" */
  ackPreorder?: boolean;
}`],
    ["    if (combo.stockLeft < cartItem.quantity) {",
`    // Pre-order: the switch is on and there is no stock. Nothing is taken from stock; you buy it after payment.
    const isPre = Boolean((combo as any).preorder) && combo.stockLeft === 0;
    if (!isPre && combo.stockLeft < cartItem.quantity) {`],
    ["      variantSummary,\n      isFreeGift: isFree,\n    });",
`      variantSummary,
      isFreeGift: isFree,
      ...(isPre
        ? {
            preorder: true,
            leadDaysMin: Number((combo as any).leadDaysMin) || 5,
            leadDaysMax: Number((combo as any).leadDaysMax) || 10,
          }
        : {}),
    });`],
    ['async function takeStockForItem(item: OrderItemSnapshot): Promise<"gift" | "combo"> {',
`async function takeStockForItem(item: OrderItemSnapshot): Promise<"gift" | "combo"> {
  // Pre-order line: there is no stock to take
  if (item.preorder) return "combo";`],
    ['async function giveStockBackForItem(item: OrderItemSnapshot, kind?: "gift" | "combo"): Promise<void> {',
`async function giveStockBackForItem(item: OrderItemSnapshot, kind?: "gift" | "combo"): Promise<void> {
  // Pre-order line: nothing was taken, so nothing goes back
  if (item.preorder) return;`],
    ["  const shippingFee = bulk && baseFee > 0 ? BULK_DELIVERY_FEE : baseFee;",
`  const shippingFee = bulk && baseFee > 0 ? BULK_DELIVERY_FEE : baseFee;

  // Pre-order items: the customer must tick the box and pay online (you buy the goods after payment).
  const hasPre = items.some((i) => i.preorder);
  if (hasPre && !manual) {
    if (!input.ackPreorder) {
      throw new OrderError(400, "PREORDER_ACK", "Please tick the box to say you understand some items are pre-order.");
    }
    if (input.paymentMethod !== "paystack") {
      throw new OrderError(400, "PREORDER_PAY_ONLINE", "Pre-order items must be paid online. Please choose Pay online.");
    }
  }`],
    ["      isBulk: bulk,",
`      isBulk: bulk,
      hasPreorder: hasPre,
      awaitingGoods: hasPre,`],
  ]],

  ["server/routes/orders.ts", "ackPreorder", false, [
    ["const order = await createOrder({ items, shipping, paymentMethod, notes });",
     "const order = await createOrder({ items, shipping, paymentMethod, notes, ackPreorder: req.body.ackPreorder === true });"],
  ]],

  ["server/routes/admin/fulfilment.ts", "awaitingGoods", false, [
    ["const TO_PACK_FILTER = {\n  $or: [",
`const TO_PACK_FILTER = {
  // pre-order orders wait on the To get page until you press Got it
  awaitingGoods: { $ne: true },
  $or: [`],
    ['router.post("/:id/ship", async (req: Request, res: Response) => {\n  try {\n    const existing = await Order.findById(req.params.id).select("orderNumber status paymentMethod").lean();\n    if (!existing) return bad(res, 404, "Order not found");',
`router.post("/:id/ship", async (req: Request, res: Response) => {
  try {
    const existing = await Order.findById(req.params.id).select("orderNumber status paymentMethod awaitingGoods").lean();
    if (!existing) return bad(res, 404, "Order not found");
    if ((existing as any).awaitingGoods) return bad(res, 409, "This order is waiting for goods. Press Got it on the To get page first.");`],
    ['router.post("/:id/delivered", async (req: Request, res: Response) => {\n  try {\n    const existing = await Order.findById(req.params.id).select("orderNumber status paymentMethod").lean();\n    if (!existing) return bad(res, 404, "Order not found");',
`router.post("/:id/delivered", async (req: Request, res: Response) => {
  try {
    const existing = await Order.findById(req.params.id).select("orderNumber status paymentMethod awaitingGoods").lean();
    if (!existing) return bad(res, 404, "Order not found");
    if ((existing as any).awaitingGoods) return bad(res, 409, "This order is waiting for goods. Press Got it on the To get page first.");`],
  ]],

  ["server/index.ts", "adminToGetRouter", false, [
    ['import adminFulfilmentRouter from "./routes/admin/fulfilment";',
`import adminFulfilmentRouter from "./routes/admin/fulfilment";
import adminToGetRouter from "./routes/admin/toget";`],
    ['app.use("/api/admin/fulfilment", requireAuth, adminFulfilmentRouter);',
`app.use("/api/admin/fulfilment", requireAuth, adminFulfilmentRouter);
  app.use("/api/admin/to-get", requireAuth, adminToGetRouter);`],
  ]],

  ["client/App.tsx", "AdminToGet", false, [
    ["import AdminFulfilment from './pages/AdminFulfilment';",
`import AdminFulfilment from './pages/AdminFulfilment';
import AdminToGet from './pages/AdminToGet';`],
    ['<Route path="/admin/ads" element=',
`<Route path="/admin/to-get" element={<AdminProtectedRoute><AdminToGet /></AdminProtectedRoute>} />
                  <Route path="/admin/ads" element=`],
  ]],

  ["client/pages/AdminDashboard.tsx", "/admin/to-get", true, [
    ['<TileLink to="/admin/chats" Icon={MessageCircle}',
`<TileLink to="/admin/to-get" Icon={Package} label="To get" desc="Pre-order items to buy for paid orders" />
            <TileLink to="/admin/chats" Icon={MessageCircle}`],
  ]],

  ["client/stores/cart.ts", "preorderFlags", false, [
    ["import { priceForQty, repriceLine, tiersOf } from '@/lib/bulk';",
`import { priceForQty, repriceLine, tiersOf } from '@/lib/bulk';
import { preorderFlags } from '@/lib/preorder';`],
    ["unitPrice: priceForQty(combo.totalPrice, tiersOf(combo), i.quantity + quantity),\n                    ...({ bulkTiers: tiersOf(combo), basePrice: combo.totalPrice } as object),",
`unitPrice: priceForQty(combo.totalPrice, tiersOf(combo), i.quantity + quantity),
                    ...({ bulkTiers: tiersOf(combo), basePrice: combo.totalPrice, ...preorderFlags(combo) } as object),`],
    ["                quantity,\n                ...({ bulkTiers: tiersOf(combo), basePrice: combo.totalPrice } as object),",
`                quantity,
                ...({ bulkTiers: tiersOf(combo), basePrice: combo.totalPrice, ...preorderFlags(combo) } as object),`],
  ]],

  ["client/pages/Checkout.tsx", "lineIsPreorder", false, [
    ["import { BULK_DELIVERY_FEE, lineIsBulk } from '@/lib/bulk';",
`import { BULK_DELIVERY_FEE, lineIsBulk } from '@/lib/bulk';
import { cartPreorderWindow, lineIsPreorder } from '@/lib/preorder';`],
    ["  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paystack');",
`  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paystack');
  const [ackPre, setAckPre] = useState(false);`],
    ["  const hasBulk = items.some((i) => lineIsBulk(i));",
`  const hasBulk = items.some((i) => lineIsBulk(i));
  const hasPre = items.some((i) => lineIsPreorder(i));
  const preWindow = cartPreorderWindow(items);
  // bulk and pre-order items are paid online only
  const onlineOnly = hasBulk || hasPre;`],
    ["    if (hasBulk) setPaymentMethod('paystack');\n  }, [hasBulk]);",
     "    if (onlineOnly) setPaymentMethod('paystack');\n  }, [onlineOnly]);"],
    ["{isCodEligible && !hasBulk && (", "{isCodEligible && !onlineOnly && ("],
    ['                    disabled={hasBulk}\n                    title="Direct bank transfer"', '                    disabled={onlineOnly}\n                    title="Direct bank transfer"'],
    ['                    disabled={hasBulk}\n                    title="Pay via WhatsApp"', '                    disabled={onlineOnly}\n                    title="Pay via WhatsApp"'],
    ["                    disabled={!isCodEligible || hasBulk}", "                    disabled={!isCodEligible || onlineOnly}"],
    ["                      hasBulk\n                        ? 'Not available for bulk orders. Please pay online.'",
     "                      onlineOnly\n                        ? 'Not available for bulk or pre-order items. Please pay online.'"],
    ['              <Section title="Payment method">',
`              {hasPre && (
                <div className="rounded-2xl border border-primary/40 p-4 md:p-5" style={{ background: 'rgba(255,200,40,0.08)' }}>
                  <p className="text-sm md:text-base font-black text-primary mb-1">Some items are pre-order</p>
                  <p className="text-[13px] md:text-sm text-white/75 leading-relaxed mb-3">
                    We get these items for you after you pay. They arrive in {preWindow.min} to {preWindow.max} business days after
                    payment. If we cannot get them, you get your money back.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={ackPre}
                      onChange={(e) => setAckPre(e.target.checked)}
                      className="mt-0.5 w-5 h-5 accent-yellow-400"
                    />
                    <span className="text-sm font-bold text-white">I understand some items are pre-order.</span>
                  </label>
                </div>
              )}

              <Section title="Payment method">`],
    ["    if (giftUnlocked && !pickedGift && gifts && gifts.length > 0) {",
`    if (hasPre && !ackPre) {
      toast.error('Please tick the box to say you understand some items are pre-order.');
      return;
    }

    if (giftUnlocked && !pickedGift && gifts && gifts.length > 0) {`],
    ["        paymentMethod,\n        notes: form.notes?.trim() || undefined,\n      });",
     "        paymentMethod,\n        notes: form.notes?.trim() || undefined,\n        ackPreorder: ackPre,\n      });"],
  ]],

  ["client/api/orders.ts", "ackPreorder", false, [
    ["  paymentMethod: PaymentMethod;\n  notes?: string;\n}",
     "  paymentMethod: PaymentMethod;\n  notes?: string;\n  ackPreorder?: boolean;\n}"],
    ["    notes: input.notes,", "    notes: input.notes,\n    ackPreorder: Boolean(input.ackPreorder),"],
  ]],

  ["client/pages/ComboDetail.tsx", "PreorderNotice", false, [
    ["import { BulkBox } from '@/components/BulkBox';",
`import { BulkBox } from '@/components/BulkBox';
import { PreorderNotice, usePreorder } from '@/components/PreorderNotice';`],
    ["  onAddToCart: (qty?: number) => void;\n}) {", "  onAddToCart: (qty?: number) => void;\n}) {\n  const pre = usePreorder();"],
    ["          <BulkBox onAdd={(q) => onAddToCart(q)} />", "          <PreorderNotice />\n          <BulkBox onAdd={(q) => onAddToCart(q)} />"],
    ["              disabled={stockLeft === 0}", "              disabled={stockLeft === 0 && !pre.active}"],
    ["{stockLeft === 0 ? 'Out of stock' : 'Add to cart'}", "{stockLeft === 0 ? (pre.active ? 'Pre-order now' : 'Out of stock') : 'Add to cart'}"],
    ["                    disabled={combo.stockLeft === 0}", "                    disabled={combo.stockLeft === 0 && !(combo as any).preorder}"],
    ["{combo.stockLeft === 0 ? 'Out of stock' : 'Add to cart'}", "{combo.stockLeft === 0 ? ((combo as any).preorder ? 'Pre-order now' : 'Out of stock') : 'Add to cart'}"],
  ]],

  ["client/components/MobileComboDetail.tsx", "PreorderNotice", false, [
    ["import { BulkBox } from '@/components/BulkBox';",
`import { BulkBox } from '@/components/BulkBox';
import { PreorderNotice } from '@/components/PreorderNotice';
import { preorderInfo } from '@/lib/preorder';`],
    ["  const outOfStock = combo.stockLeft === 0;",
     "  const isPre = preorderInfo(combo).active;\n  const outOfStock = combo.stockLeft === 0 && !isPre;"],
    ["{outOfStock ? 'Out of stock' : ctaLabel}", "{outOfStock ? 'Out of stock' : isPre ? 'Pre-order now' : ctaLabel}"],
    ["        <BulkBox combo={combo} onAdd={(q) => (onOrder ? onOrder(q) : openWhatsApp())} />",
     "        <PreorderNotice combo={combo} />\n        <BulkBox combo={combo} onAdd={(q) => (onOrder ? onOrder(q) : openWhatsApp())} />"],
  ]],

  ["client/sections/ComboShowcase.tsx", "preorder", true, [
    ["            disabled={combo.stockLeft === 0}", "            disabled={combo.stockLeft === 0 && !(combo as any).preorder}"],
    ["{combo.stockLeft === 0 ? 'Out of stock' : ", "{combo.stockLeft === 0 ? ((combo as any).preorder ? 'Pre-order now' : 'Out of stock') : "],
  ]],

  ["client/api/adminCombos.ts", "leadDaysMax", false, [
    ["  bulkTiers?: Array<{ minQty: number; unitPrice: number }>;",
     "  bulkTiers?: Array<{ minQty: number; unitPrice: number }>;\n  /** pre-order switch and waiting time in business days (owner only on the server) */\n  preorder?: boolean;\n  leadDaysMin?: number;\n  leadDaysMax?: number;"],
  ]],

  ["client/pages/AdminComboEdit.tsx", "leadDaysMax", false, [
    ["import { BulkPricesEditor } from '@/components/BulkPricesEditor';",
     "import { BulkPricesEditor } from '@/components/BulkPricesEditor';\nimport { PreorderEditor } from '@/components/PreorderEditor';"],
    ["  bulkTiers: Array<{ minQty: number; unitPrice: number }>;\n  isFeatured: boolean;",
     "  bulkTiers: Array<{ minQty: number; unitPrice: number }>;\n  preorder: boolean;\n  leadDaysMin: number;\n  leadDaysMax: number;\n  isFeatured: boolean;"],
    ["bulkTiers: [], isFeatured: false,", "bulkTiers: [], preorder: false, leadDaysMin: 5, leadDaysMax: 10, isFeatured: false,"],
    ["    isFeatured: combo.isFeatured,",
`    preorder: Boolean((combo as any).preorder),
    leadDaysMin: Number((combo as any).leadDaysMin) || 5,
    leadDaysMax: Number((combo as any).leadDaysMax) || 10,
    isFeatured: combo.isFeatured,`],
    ["    isFeatured: form.isFeatured,",
`    preorder: form.preorder,
    leadDaysMin: form.leadDaysMin,
    leadDaysMax: form.leadDaysMax,
    isFeatured: form.isFeatured,`],
    ["      if (i > 0 && t.minQty <= form.bulkTiers[i - 1].minQty) return 'Bulk prices must go up in quantity, row by row';\n    }",
`      if (i > 0 && t.minQty <= form.bulkTiers[i - 1].minQty) return 'Bulk prices must go up in quantity, row by row';
    }
    if (form.preorder && (form.leadDaysMin < 1 || form.leadDaysMax < form.leadDaysMin)) {
      return 'Pre-order waiting time: start at 1 day, and the second number cannot be smaller than the first';
    }`],
    ['        <Section title="Visibility">',
`        <PreorderEditor
          preorder={form.preorder}
          min={form.leadDaysMin}
          max={form.leadDaysMax}
          onChange={(p) => setForm((f) => ({ ...f, ...p }))}
        />

        <Section title="Visibility">`],
  ]],
];

// ---------- run ----------
const norm = (s) => s.replace(/\r\n/g, "\n");
const plan = [];
let problems = 0;

for (const [rel, marker, optional, edits] of EDITS) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    if (optional) { console.log(`! skipped (file not found): ${rel}`); continue; }
    console.error("MISSING file: " + rel); problems++; continue;
  }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let text = norm(raw);
  if (text.includes(marker)) { console.log("already patched: " + rel); continue; }
  let bad = 0;
  for (const [anchor, replacement] of edits) {
    const a = norm(anchor);
    const count = text.split(a).length - 1;
    if (count !== 1) {
      const msg = `${rel}: anchor found ${count} times: ${a.split("\n")[0].trim()}`;
      if (optional) console.log("! " + msg); else console.error("CANNOT PLACE in " + msg);
      bad++;
      continue;
    }
    text = text.replace(a, () => norm(replacement));
  }
  if (bad > 0) {
    if (optional) { console.log(`! skipped (nothing changed): ${rel}`); continue; }
    problems++;
    continue;
  }
  plan.push({ rel, file, text, crlf });
}

if (problems > 0) {
  console.error("\nNothing was changed. Send this output to Claude.");
  process.exit(1);
}

for (const rel of NEW_FILES) {
  const src = path.join(here, "files", rel);
  if (!fs.existsSync(src) && !fs.existsSync(path.join(root, rel))) {
    console.error("MISSING from the zip: " + rel + "\nNothing was changed.");
    process.exit(1);
  }
}

for (const p of plan) {
  const bak = p.file + ".bak-preorder";
  if (!fs.existsSync(bak)) fs.copyFileSync(p.file, bak);
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
// when the zip was copied into the project folder, tidy up the spare copies (only our own files)
if (path.resolve(here) === path.resolve(root)) {
  for (const rel of NEW_FILES) fs.rmSync(path.join(here, "files", rel), { force: true });
  const left = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []);
  const prune = (d) => {
    for (const e of left(d)) if (e.isDirectory()) prune(path.join(d, e.name));
    if (left(d).length === 0) fs.rmSync(d, { recursive: true, force: true });
  };
  prune(path.join(here, "files"));
}
console.log("\nDone. Stop all node windows, then run one: npm run dev");
