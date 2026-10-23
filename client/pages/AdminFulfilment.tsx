/**
 * Fulfilment queue: pack paid orders, print a packing slip, add the Jumia tracking number, mark shipped/delivered.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Printer, Truck, PackageCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import {
  getFulfilment, markPacked, markShipped, markDelivered,
  type FulfilOrder, type FulfilRoute,
} from '@/api/adminFulfilment';
import { formatNaira } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';

const ROUTE_LABEL: Record<FulfilRoute, string> = {
  local: 'Ilorin: we deliver',
  jumia: 'Jumia: drop at Jumia office',
  pickup: 'Pickup / walk-in',
};
const ROUTE_STYLE: Record<FulfilRoute, string> = {
  local: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  jumia: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
  pickup: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const SITE = 'smartcombo.com.ng';

function slipHtml(o: FulfilOrder) {
  const addr = o.route === 'pickup'
    ? 'Pickup / walk-in'
    : [o.shipping.street, o.shipping.landmark, o.shipping.city, o.shipping.state].filter(Boolean).join(', ');
  const rows = o.items
    .map((i) => `<tr><td class="q">${esc(i.quantity)}</td><td class="nm">${esc(i.variantSummary || i.name)}${i.isFreeGift ? '<span class="gift">FREE GIFT</span>' : ''}</td><td class="bx"><span></span></td></tr>`)
    .join('');
  const cod = o.paymentMethod === 'cod';
  const unpaid = !cod && o.status === 'pending';
  const payClass = cod ? 'cod' : unpaid ? 'unpaid' : 'paid';
  const payText = cod ? `Collect ${formatNaira(o.total)} on delivery` : unpaid ? `Not paid yet: ${formatNaira(o.total)}` : 'Paid';
  const date = new Date(o.paidAt || o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const how = o.route === 'jumia' ? 'Ship via Jumia' : o.route === 'local' ? 'Deliver in Ilorin' : 'Customer pickup';
  return `<section class="slip">
  <div class="top"><div class="brand"><span class="logo">SC</span><div><b>Smart Combo</b><small>Packing slip</small></div></div>
    <div class="no"><small>Order</small><b>${esc(o.orderNumber)}</b></div></div>
  <div class="bar"><span>${esc(how)}</span><span>${esc(date)}</span></div>
  <div class="body">
    <div class="card"><small>Ship to</small><h2>${esc(o.shipping.fullName)}</h2><p class="ph">${esc(o.shipping.phone)}</p><p>${esc(addr)}</p></div>
    <table><thead><tr><th>Qty</th><th>Item</th><th>Packed</th></tr></thead><tbody>${rows}</tbody></table>
    ${o.notes ? `<div class="note"><b>Customer note:</b> ${esc(o.notes)}</div>` : ''}
    <div class="pay ${payClass}">${esc(payText)}</div>
  </div>
  <div class="foot">Thank you for shopping with Smart Combo · ${SITE}</div></section>`;
}

function printSlips(orders: FulfilOrder[]) {
  if (orders.length === 0) return;
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) { toast.error('Allow pop-ups for this site to print slips'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Packing slips</title><style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{margin:12mm}
  body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#111;background:#fff}
  .slip{max-width:640px;margin:0 auto 24px;border:2px solid #111;border-radius:16px;overflow:hidden;page-break-after:always;break-inside:avoid}
  .slip:last-child{page-break-after:auto}
  .top{background:#0a0a0a;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:18px 22px}
  .brand{display:flex;align-items:center;gap:12px}
  .logo{width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#000;font-weight:900;font-size:17px;display:flex;align-items:center;justify-content:center}
  .brand b{display:block;font-size:19px}.brand small{color:#FFD700;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700}
  .no{text-align:right}.no small{display:block;color:#aaa;font-size:10px;letter-spacing:2px;text-transform:uppercase}.no b{color:#FFD700;font-size:20px;letter-spacing:.5px}
  .bar{background:linear-gradient(90deg,#FFD700,#F59E0B);color:#000;display:flex;justify-content:space-between;padding:9px 22px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px}
  .body{padding:20px 22px}
  .card{background:#fafafa;border:1px solid #e5e5e5;border-left:5px solid #FFD700;border-radius:10px;padding:12px 16px}
  .card small{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#777;font-weight:700}
  .card h2{margin:4px 0 2px;font-size:20px}.card p{margin:2px 0;font-size:14px;color:#333}.card .ph{font-weight:700}
  table{width:100%;border-collapse:collapse;margin:18px 0 6px}
  th{text-align:left;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#777;padding:0 6px 6px;border-bottom:2px solid #111}
  th:last-child{text-align:center}
  td{padding:11px 6px;border-bottom:1px solid #ddd;font-size:15px}
  .q{width:50px;font-weight:900;font-size:18px}.bx{width:60px;text-align:center}
  .bx span{display:inline-block;width:22px;height:22px;border:2px solid #111;border-radius:6px}
  .gift{margin-left:8px;background:#0a0a0a;color:#FFD700;font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;letter-spacing:1px}
  .note{margin-top:12px;background:#FFF8DC;border:1px dashed #F59E0B;border-radius:8px;padding:9px 12px;font-size:13px}
  .pay{margin-top:16px;text-align:center;font-weight:900;font-size:18px;text-transform:uppercase;letter-spacing:1px;padding:12px;border-radius:10px}
  .pay.paid{background:#E8F8EE;color:#0b6b2f;border:2px solid #0b6b2f}
  .pay.cod{background:#FFF1D6;color:#8a4b00;border:2px solid #F59E0B}
  .pay.unpaid{background:#FDE8E8;color:#a11;border:2px solid #a11}
  .foot{background:#0a0a0a;color:#FFD700;text-align:center;font-size:11px;padding:11px;letter-spacing:.5px}
  </style></head><body>${orders.map(slipHtml).join('')}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function age(iso?: string) {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminFulfilment() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pack' | 'transit'>('pack');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-fulfilment'], queryFn: getFulfilment });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-fulfilment'] });
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
  };
  const onErr = (e: any) => toast.error(e?.message || 'Something went wrong');

  const packed = useMutation({ mutationFn: markPacked, onSuccess: () => { toast.success('Marked as packed'); refresh(); }, onError: onErr });
  const shipped = useMutation({
    mutationFn: (v: { id: string; tn: string; tu: string }) => markShipped(v.id, v.tn, v.tu),
    onSuccess: () => { toast.success('Marked as shipped'); refresh(); }, onError: onErr,
  });
  const delivered = useMutation({ mutationFn: markDelivered, onSuccess: () => { toast.success('Marked as delivered'); refresh(); }, onError: onErr });

  const list = tab === 'pack' ? data?.toPack ?? [] : data?.inTransit ?? [];

  return (
    <AdminFrame>
      <SEO title="Fulfilment" />
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Fulfilment</h1>
          <p className="text-sm text-white/45">Oldest orders first. Pack, print the slip, add the tracking number, ship.</p>
        </div>
        {tab === 'pack' && list.length > 0 && (
          <button type="button" onClick={() => printSlips(list)}
            className="px-4 py-2 rounded-lg border border-white/15 text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print all {list.length} slips
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {([['pack', `To pack (${data?.toPack.length ?? 0})`], ['transit', `On the way (${data?.inTransit.length ?? 0})`]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-full text-xs font-bold border ${tab === k ? 'bg-primary text-black border-primary' : 'border-white/15 text-white/70 hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-white/45 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}
      {error && <p className="text-sm text-red-300">Could not load the queue.</p>}
      {!isLoading && !error && list.length === 0 && (
        <p className="text-sm text-white/45 py-10 text-center">{tab === 'pack' ? 'Nothing to pack. All caught up.' : 'Nothing is on the way right now.'}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((o) => (
          <OrderCard key={o._id} o={o} tab={tab}
            busy={packed.isPending || shipped.isPending || delivered.isPending}
            onPacked={() => packed.mutate(o._id)}
            onShip={(tn, tu) => shipped.mutate({ id: o._id, tn, tu })}
            onDelivered={() => delivered.mutate(o._id)} />
        ))}
      </div>
    </AdminFrame>
  );
}

function OrderCard({ o, tab, busy, onPacked, onShip, onDelivered }: {
  o: FulfilOrder; tab: 'pack' | 'transit'; busy: boolean;
  onPacked: () => void; onShip: (tn: string, tu: string) => void; onDelivered: () => void;
}) {
  const [tn, setTn] = useState('');
  const [tu, setTu] = useState('');
  const { can } = useAuth();
  const unpaidCod = o.paymentMethod === 'cod';
  const handsOn = o.route === 'jumia';
  const input = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-primary/50';

  return (
    <article className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          {can('orders.view') ? <Link to={`/admin/orders/${o._id}`} className="text-sm font-black text-white hover:text-primary">{o.orderNumber}</Link> : <span className="text-sm font-black text-white">{o.orderNumber}</span>}
          <p className="text-[11px] text-white/40">{age(tab === 'pack' ? o.paidAt || o.createdAt : o.shippedAt)} · {formatNaira(o.total)}{unpaidCod ? ' · collect on delivery' : ''}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${ROUTE_STYLE[o.route]}`}>{ROUTE_LABEL[o.route]}</span>
      </div>

      <p className="text-sm font-bold text-white">{o.shipping.fullName} <span className="text-white/50 font-normal">· {o.shipping.phone}</span></p>
      {o.route !== 'pickup' && <p className="text-xs text-white/55 mb-2">{o.shipping.street}, {o.shipping.city}, {o.shipping.state}</p>}

      <ul className="my-3 space-y-1 text-xs text-white/80">
        {o.items.map((i, n) => (
          <li key={n} className="flex gap-2"><b className="text-primary">{i.quantity}×</b><span>{i.variantSummary || i.name}{i.isFreeGift && <b className="ml-1 text-emerald-300">FREE GIFT</b>}</span></li>
        ))}
      </ul>
      {o.notes && <p className="text-[11px] text-amber-300 mb-2">Customer note: {o.notes}</p>}

      {tab === 'pack' ? (
        <div className="space-y-2">
          {handsOn && (
            <div className="grid grid-cols-1 gap-2">
              <input className={input} value={tn} onChange={(e) => setTn(e.target.value)} placeholder="Jumia tracking number (add when you have it)" />
              <input className={input} value={tu} onChange={(e) => setTu(e.target.value)} placeholder="Tracking link (optional, https://…)" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => printSlips([o])} className="px-3 py-2 rounded-lg border border-white/15 text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Slip</button>
            {o.status !== 'processing' && (
              <button type="button" disabled={busy} onClick={onPacked} className="px-3 py-2 rounded-lg border border-white/15 text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-1.5 disabled:opacity-50"><PackageCheck className="w-3.5 h-3.5" /> Packed</button>
            )}
            {o.status === 'processing' && <span className="px-3 py-2 text-xs font-bold text-blue-300">Packed</span>}
            {o.route === 'pickup' ? (
              <button type="button" disabled={busy} onClick={onDelivered} className="px-3 py-2 rounded-lg bg-primary text-black text-xs font-black flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" /> Handed over</button>
            ) : (
              <button type="button" disabled={busy} onClick={() => onShip(tn, tu)} className="px-3 py-2 rounded-lg bg-primary text-black text-xs font-black flex items-center gap-1.5 disabled:opacity-50"><Truck className="w-3.5 h-3.5" /> {handsOn ? 'Mark shipped' : 'Out for delivery'}</button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {o.trackingNumber && <p className="text-xs text-white/70">Tracking: <b className="text-white">{o.trackingNumber}</b>{o.trackingProviderUrl && <> · <a href={o.trackingProviderUrl} target="_blank" rel="noreferrer" className="text-primary underline">open</a></>}</p>}
          <button type="button" disabled={busy} onClick={onDelivered} className="px-3 py-2 rounded-lg bg-primary text-black text-xs font-black flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" /> Mark delivered</button>
        </div>
      )}
    </article>
  );
}
