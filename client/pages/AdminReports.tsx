/** SC-STAFF2  /admin/reports — sales report (no cost or profit) and CSV export. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { formatNaira } from '@/lib/format';
import { EXPENSE_LABELS, type ExpenseCategory } from '@/api/adminProfit';
import { downloadCsv, getSalesReport } from '@/api/adminBooks';
import { PRESETS, presetRange, type Preset } from '@/lib/period';

const inputCls = 'px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white';
const METHOD: Record<string, string> = {
  paystack: 'Paystack', flutterwave: 'Flutterwave', bank_transfer: 'Bank transfer', cod: 'Cash on delivery',
  whatsapp: 'WhatsApp', cash: 'Cash', pos: 'POS',
};
const SOURCE: Record<string, string> = { website: 'Website', whatsapp: 'WhatsApp', walkin: 'Walk-in', social: 'Social media', other: 'Other' };
const label = (m: Record<string, string>, k: string) => m[k] ?? k;

export default function AdminReports() {
  const [preset, setPreset] = useState<Preset>('month');
  const [range, setRange] = useState(presetRange('month'));
  const choose = (p: Preset) => { setPreset(p); if (p !== 'custom') setRange(presetRange(p)); };
  const q = useQuery({ queryKey: ['book-report', range.from, range.to], queryFn: () => getSalesReport(range.from, range.to) });
  const r = q.data;
  const dl = (kind: 'orders' | 'expenses') =>
    downloadCsv(kind, range.from, range.to).catch((e) => toast.error(e?.message || 'Download failed'));

  return (
    <AdminFrame>
      <SEO title="Sales report" />
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Sales report</h1>
      <p className="text-sm text-white/45 mb-6">Paid orders only are counted in the totals. Cancelled and refunded orders are listed but not added up.</p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => choose(p.id)}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
              preset === p.id ? 'bg-primary/15 border-primary/40 text-primary' : 'border-white/10 text-white/60 hover:border-white/25'}`}>
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={range.from} max={range.to} onChange={(e) => setRange((x) => ({ ...x, from: e.target.value }))} className={inputCls} />
            <span className="text-white/40 text-xs">to</span>
            <input type="date" value={range.to} min={range.from} onChange={(e) => setRange((x) => ({ ...x, to: e.target.value }))} className={inputCls} />
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={() => dl('orders')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:border-primary/40">
            <Download className="w-3.5 h-3.5" /> Orders CSV
          </button>
          <button type="button" onClick={() => dl('expenses')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:border-primary/40">
            <Download className="w-3.5 h-3.5" /> Expenses CSV
          </button>
        </div>
      </div>

      {q.isLoading && <div className="flex items-center gap-2 text-white/50 text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
      {q.isError && <p className="text-sm text-red-300 py-6">Could not load the report. Try again.</p>}

      {r && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Paid orders" value={String(r.totals.orders)} />
            <Stat label="Items sold (₦)" value={formatNaira(r.totals.sales)} />
            <Stat label="Delivery fees" value={formatNaira(r.totals.deliveryFees)} />
            <Stat label="Total collected" value={formatNaira(r.totals.collected)} />
          </div>
          <div className="rounded-2xl border border-white/10 p-4 mb-8" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">Expenses in this period</p>
            <p className="text-xl font-black text-white tabular-nums">{formatNaira(r.expenses.total)}</p>
            <p className="text-[11px] text-white/45 mt-1">
              {Object.entries(r.expenses.byCategory).map(([k, v]) => `${EXPENSE_LABELS[k as ExpenseCategory] ?? k}: ${formatNaira(v)}`).join('  ·  ') || 'None recorded'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Breakdown title="By payment method" rows={Object.entries(r.byMethod).map(([k, v]) => [label(METHOD, k), v.orders, v.total])} />
            <Breakdown title="By where the order came from" rows={Object.entries(r.bySource).map(([k, v]) => [label(SOURCE, k), v.orders, v.total])} />
          </div>

          <h2 className="text-base font-bold text-white mb-1">Orders</h2>
          <p className="text-xs text-white/45 mb-3">
            {Object.entries(r.byStatus).map(([k, v]) => `${k}: ${v}`).join('  ·  ') || 'No orders'}
            {r.truncated ? ' · showing the latest 300 (download the CSV for all)' : ''}
          </p>
          <div className="rounded-2xl border border-white/10 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-left text-white/40 uppercase tracking-wider text-[10px] border-b border-white/10">
                  <th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Status</th>
                  <th className="p-3">Payment</th><th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Delivery</th><th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {r.orders.map((o) => (
                  <tr key={o._id} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-white font-semibold">{o.orderNumber}</td>
                    <td className="p-3 text-white/60">{new Date(o.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}</td>
                    <td className="p-3 text-white/70 capitalize">{o.status}</td>
                    <td className="p-3 text-white/60">{label(METHOD, o.paymentMethod)}</td>
                    <td className="p-3 text-right tabular-nums text-white/70">{formatNaira(o.subtotal)}</td>
                    <td className="p-3 text-right tabular-nums text-white/70">{formatNaira(o.shippingFee)}</td>
                    <td className="p-3 text-right tabular-nums font-bold text-white">{formatNaira(o.total)}</td>
                  </tr>
                ))}
                {r.orders.length === 0 && <tr><td colSpan={7} className="p-5 text-white/45">No orders in this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<[string, number, number]> }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
      {rows.length === 0 ? <p className="text-xs text-white/45">Nothing yet.</p> : rows.map(([name, n, total]) => (
        <div key={name} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
          <span className="text-white/70">{name} <span className="text-white/35">({n})</span></span>
          <span className="text-white tabular-nums font-semibold">{formatNaira(total)}</span>
        </div>
      ))}
    </div>
  );
}
