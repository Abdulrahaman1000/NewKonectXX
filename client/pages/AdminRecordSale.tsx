/**
 * Admin: Record a sale.
 * For orders that do not come through the website checkout: WhatsApp chats, walk-ins, phone calls.
 * The sale is saved as a normal order, so stock, profit, free-gift progress and partner commission all stay correct.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { listCombosAdmin } from '@/api/adminCombos';
import { createManualSale, SOURCE_LABELS, type SalePayment, type SaleSource } from '@/api/adminSale';
import { formatNaira } from '@/lib/format';

const LOCAL_DELIVERY_FEE = 1000;
const STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti',
  'Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun',
  'Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

const darkSelectCss = "select{color-scheme:dark} select option{background:#1a1a1a;color:#fff} select option:disabled{color:#777}";
const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder:text-white/30';

interface Line { key: number; comboId: string; quantity: number; variants: Record<string, string> }

/** Same rule the server uses: a typed combo cost wins, otherwise the item costs (a variant with its own cost overrides). */
function unitCost(combo: any, variants: Record<string, string>): number {
  const own = Number(combo?.costPrice) || 0;
  if (own > 0) return own;
  let total = 0;
  for (const item of combo?.items ?? []) {
    let cost = Number(item.costPrice) || 0;
    const alt = (item.alternatives ?? []).find((a: any) => a.id === variants[item.id]);
    if (alt && Number(alt.costPrice) > 0) cost = Number(alt.costPrice);
    total += cost;
  }
  return total;
}

export default function AdminRecordSale() {
  const navigate = useNavigate();
  const { data: combos = [], isLoading } = useQuery({ queryKey: ['admin-combos-for-sale'], queryFn: listCombosAdmin });

  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pickup, setPickup] = useState(false);
  const [state, setState] = useState('Kwara');
  const [city, setCity] = useState('Ilorin');
  const [street, setStreet] = useState('');
  const [source, setSource] = useState<SaleSource>('whatsapp');
  const [payment, setPayment] = useState<SalePayment>('bank_transfer');
  const [paid, setPaid] = useState(false);
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');

  const available = useMemo(() => (combos as any[]).filter((c) => c.isActive !== false), [combos]);
  const byId = useMemo(() => new Map((combos as any[]).map((c) => [c.id, c])), [combos]);

  const addLine = () => {
    if (!pick) return;
    setLines((l) => [...l, { key: Date.now() + Math.random(), comboId: pick, quantity: 1, variants: {} }]);
    setPick('');
  };
  const patchLine = (key: number, patch: Partial<Line>) =>
    setLines((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const setVariant = (key: number, k: string, v: string) =>
    setLines((l) => l.map((x) => {
      if (x.key !== key) return x;
      const variants = { ...x.variants };
      if (v) variants[k] = v; else delete variants[k];
      return { ...x, variants };
    }));

  const subtotal = lines.reduce((s, l) => s + (byId.get(l.comboId)?.totalPrice ?? 0) * l.quantity, 0);
  const cost = lines.reduce((s, l) => s + unitCost(byId.get(l.comboId), l.variants) * l.quantity, 0);
  const costKnown = lines.length > 0 && lines.every((l) => unitCost(byId.get(l.comboId), l.variants) > 0);
  const delivery = !pickup && city.trim().toLowerCase() === 'ilorin' ? LOCAL_DELIVERY_FEE : 0;
  const total = subtotal + delivery;

  const save = useMutation({
    mutationFn: () =>
      createManualSale({
        items: lines.map((l) => ({ comboId: l.comboId, quantity: l.quantity, selectedVariants: l.variants })),
        customer: { fullName: fullName.trim(), phone: phone.trim(), email: email.trim(), state: state.trim(), city: city.trim(), street: street.trim() },
        pickup,
        source,
        paymentMethod: payment,
        paid,
        notes: notes.trim(),
        ref: ref.trim(),
      }),
    onSuccess: (o) => {
      toast.success(`Sale recorded: ${o.orderNumber}`);
      navigate(`/admin/orders/${o._id}`);
    },
    onError: (e: any) => toast.error(e?.message || 'Could not record the sale'),
  });

  const problem =
    lines.length === 0 ? 'Add at least one product'
    : !fullName.trim() ? "Enter the customer's name"
    : phone.replace(/\D/g, '').length < 10 ? 'Enter a valid phone number'
    : !pickup && (!state.trim() || !city.trim() || !street.trim()) ? 'Enter the delivery state, city and address'
    : null;

  return (
    <AdminFrame>
      <SEO title="Record a sale" />
      <Link to="/admin/orders" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Record a sale</h1>
      <p className="text-sm text-white/45 mb-8 max-w-2xl">
        For orders that did not come through the website, like WhatsApp or walk-in customers. Prices are the normal
        selling prices. Stock, profit and the free-gift total update automatically.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6">
          {/* Products */}
          <Card title="Products">
            {isLoading ? (
              <p className="text-sm text-white/45 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading products…</p>
            ) : (
              <div className="flex gap-2 mb-4"><style>{darkSelectCss}</style>
                <select value={pick} onChange={(e) => { const v = e.target.value; if (v) { setLines((l) => [...l, { key: Date.now() + Math.random(), comboId: v, quantity: 1, variants: {} }]); } setPick(""); }} className={inputCls}>
                  <option value="">Choose a product to add…</option>
                  {available.map((c) => (
                    <option key={c.id} value={c.id} disabled={(c.stockLeft ?? 0) < 1}>
                      {c.name} — {formatNaira(c.totalPrice)} ({c.stockLeft ?? 0} in stock)
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addLine} disabled={!pick}
                  className="hidden">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            )}

            {lines.length === 0 && <p className="text-xs text-white/40">No products added yet.</p>}
            <div className="space-y-3">
              {lines.map((l) => {
                const c: any = byId.get(l.comboId);
                if (!c) return null;
                const slots = (c.items ?? []).filter((i: any) => (i.alternatives?.length ?? 0) > 0 || (i.colors?.length ?? 0) > 0);
                return (
                  <div key={l.key} className="rounded-xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.015)' }}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{c.name}</p>
                        <p className="text-[11px] text-white/45">{formatNaira(c.totalPrice)} each · {c.stockLeft} in stock</p>
                      </div>
                      <div className="flex items-center rounded-lg border border-white/10">
                        <button type="button" aria-label="Less" className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-l-lg"
                          onClick={() => patchLine(l.key, { quantity: Math.max(1, l.quantity - 1) })}><Minus className="w-3 h-3" /></button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums">{l.quantity}</span>
                        <button type="button" aria-label="More" className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-r-lg"
                          onClick={() => patchLine(l.key, { quantity: Math.min(c.stockLeft ?? 1, Math.min(20, l.quantity + 1)) })}><Plus className="w-3 h-3" /></button>
                      </div>
                      <p className="w-24 text-right text-sm font-bold text-primary tabular-nums">{formatNaira(c.totalPrice * l.quantity)}</p>
                      <button type="button" aria-label="Remove" onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {slots.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slots.map((item: any) => (
                          <div key={item.id} className="space-y-2">
                            {(item.alternatives?.length ?? 0) > 0 && (
                              <select value={l.variants[item.id] ?? ''} onChange={(e) => setVariant(l.key, item.id, e.target.value)} className={inputCls}>
                                <option value="">{item.name} (default)</option>
                                {item.alternatives.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            )}
                            {(item.colors?.length ?? 0) > 0 && (
                              <select value={l.variants[`${item.id}__color`] ?? ''} onChange={(e) => setVariant(l.key, `${item.id}__color`, e.target.value)} className={inputCls}>
                                <option value="">{item.name}: choose color</option>
                                {item.colors.map((col: any) => <option key={col.id} value={col.id}>{col.name}</option>)}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Customer */}
          <Card title="Customer">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name *"><input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
              <Field label="Phone *"><input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" /></Field>
              <Field label="Email (optional)"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Where did this order come from?">
                <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value as SaleSource)}>
                  {(['whatsapp', 'walkin', 'social', 'other'] as const).map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </Field>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
              Customer collects it from me (no delivery)
            </label>

            {!pickup && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="State *">
                  <input className={inputCls} list="sale-states" value={state} onChange={(e) => setState(e.target.value)} />
                  <datalist id="sale-states">{STATES.map((s) => <option key={s} value={s} />)}</datalist>
                </Field>
                <Field label="City *"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
                <div className="sm:col-span-2">
                  <Field label="Address *"><input className={inputCls} value={street} onChange={(e) => setStreet(e.target.value)} /></Field>
                </div>
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card title="Payment">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="How are they paying?">
                <select className={inputCls} value={payment} onChange={(e) => setPayment(e.target.value as SalePayment)}>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="pos">POS</option>
                </select>
              </Field>
              <Field label="Partner code (optional)">
                <input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="SC1234" />
              </Field>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm text-white/80 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
              <span>
                Payment already received
                <span className="block text-[11px] text-white/45">
                  Leave this off for a transfer you are still waiting for. The sale is saved as &ldquo;awaiting payment&rdquo; and you
                  mark it paid on the order page once the money arrives.
                </span>
              </span>
            </label>
            <div className="mt-4">
              <Field label="Note (optional)">
                <textarea rows={2} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        {/* Summary */}
        <aside className="rounded-2xl border border-white/10 p-5 lg:sticky lg:top-24" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h2 className="text-sm font-bold text-white mb-4">Summary</h2>
          <dl className="space-y-2 text-xs">
            <Row k="Items" v={formatNaira(subtotal)} />
            <Row k="Delivery" v={pickup ? 'Pickup' : delivery > 0 ? formatNaira(delivery) : city.trim() ? 'Paid to Jumia' : '—'} />
          </dl>
          <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-white/70">Total</span>
            <span className="text-xl font-black text-primary tabular-nums">{formatNaira(total)}</span>
          </div>
          {lines.length > 0 && (
            <p className="mt-3 text-[11px] text-white/45">
              {costKnown
                ? `Estimated profit on items: ${formatNaira(subtotal - cost)}`
                : 'Profit is not shown: some items have no cost price yet.'}
            </p>
          )}
          {problem && <p className="mt-3 text-[11px] text-amber-300/80">{problem}</p>}
          <button
            type="button"
            disabled={!!problem || save.isPending}
            onClick={() => save.mutate()}
            className="mt-4 w-full py-3 rounded-xl bg-primary text-black text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {paid ? 'Record paid sale' : 'Record sale (awaiting payment)'}
          </button>
        </aside>
      </div>
    </AdminFrame>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <h2 className="text-sm font-bold text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">{label}</span>
      {children}
    </label>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/50">{k}</dt>
      <dd className="text-white tabular-nums">{v}</dd>
    </div>
  );
}
