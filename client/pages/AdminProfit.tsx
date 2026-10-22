/**
 * Admin: Profit & Expenses.
 * Shows sales, cost of goods, expenses and profit for a period, profit per product,
 * and lets the owner record business expenses (ads, packaging, transport...).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { formatNaira } from '@/lib/format';
import {
  EXPENSE_LABELS,
  addExpense,
  deleteExpense,
  getProfitReport,
  listExpenses,
  recalculateCosts,
  type ExpenseCategory,
} from '@/api/adminProfit';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Preset = 'today' | '7d' | 'month' | '30d' | 'custom';

function presetRange(p: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const to = ymd(now);
  if (p === 'today') return { from: to, to };
  if (p === 'month') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  const back = new Date(now);
  back.setDate(back.getDate() - (p === '7d' ? 6 : 29));
  return { from: ymd(back), to };
}

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder:text-white/30';

export default function AdminProfit() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState<Preset>('month');
  const [range, setRange] = useState(presetRange('month'));

  const [exDate, setExDate] = useState(ymd(new Date()));
  const [exCategory, setExCategory] = useState<ExpenseCategory>('ads');
  const [exAmount, setExAmount] = useState('');
  const [exNote, setExNote] = useState('');

  const recalc = useMutation({
    mutationFn: () => recalculateCosts(range.from, range.to),
    onSuccess: (res) => {
      qc.invalidateQueries();
      if (res.tried === 0) toast.info('Nothing to recalculate');
      else if (res.stillMissing === 0) toast.success(`${res.fixed} order(s) added to your profit`);
      else toast.warning(`${res.fixed} fixed, ${res.stillMissing} still have items with no cost price`);
    },
    onError: (e: any) => toast.error(e?.message || 'Could not recalculate'),
  });

  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(presetRange(p));
  };

  const report = useQuery({
    queryKey: ['admin-profit', range.from, range.to],
    queryFn: () => getProfitReport(range.from, range.to),
  });
  const expenses = useQuery({
    queryKey: ['admin-expenses', range.from, range.to],
    queryFn: () => listExpenses(range.from, range.to),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-profit'] });
    qc.invalidateQueries({ queryKey: ['admin-expenses'] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      addExpense({ date: exDate, category: exCategory, amount: Number(exAmount), note: exNote.trim() }),
    onSuccess: () => {
      toast.success('Expense saved');
      setExAmount('');
      setExNote('');
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || 'Could not save the expense'),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      toast.success('Expense removed');
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || 'Could not remove the expense'),
  });

  const r = report.data;
  const canSave = Number(exAmount) > 0 && !addMutation.isPending;

  return (
    <AdminFrame>
      <SEO title="Profit & Expenses" />
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Profit &amp; Expenses</h1>
      <p className="text-sm text-white/45 mb-6">
        Sales are counted from paid orders. Cost comes from the cost price you enter on each combo item.
      </p>

      {/* Period */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => choose(p.id)}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
              preset === p.id
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'border-white/10 text-white/60 hover:border-white/25'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={range.from} max={range.to}
              onChange={(e) => setRange((x) => ({ ...x, from: e.target.value }))} className={`${inputCls} w-auto`} />
            <span className="text-white/40 text-xs">to</span>
            <input type="date" value={range.to} min={range.from}
              onChange={(e) => setRange((x) => ({ ...x, to: e.target.value }))} className={`${inputCls} w-auto`} />
          </div>
        )}
      </div>

      {report.isLoading && (
        <div className="flex items-center gap-2 text-white/50 text-sm py-10">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {report.isError && <p className="text-sm text-red-300 py-6">Could not load the report. Try again.</p>}

      {r && (
        <>
          {r.orders.uncosted > 0 && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              {r.orders.uncosted} of {r.orders.total} paid orders in this period are left out of the profit figures
              because some items had no cost price when they were sold. Enter cost prices on your products, then
              press the button to count them using today's cost prices.
              <button type="button" onClick={() => recalc.mutate()} disabled={recalc.isPending}
                className="mt-2 block px-3 py-1.5 rounded-lg bg-amber-400 text-black font-bold disabled:opacity-50">
                {recalc.isPending ? 'Working…' : 'Recalculate cost'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Stat label="Sales" value={formatNaira(r.sales)} />
            <Stat label="Cost of goods" value={formatNaira(r.costOfGoods)} />
            <Stat label="Gross profit" value={formatNaira(r.grossProfit)} sub={`${r.marginPercent}% margin`} />
            <Stat label="Expenses" value={formatNaira(r.expensesTotal)} />
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/50 mb-1">Net profit</p>
              <p className={`text-3xl font-black tabular-nums ${r.netProfit < 0 ? 'text-red-300' : 'text-primary'}`}>
                {formatNaira(r.netProfit)}
              </p>
            </div>
            <p className="text-[11px] text-white/45 max-w-sm">
              Gross profit + delivery fees collected ({formatNaira(r.deliveryFees)}) − partner commissions ({formatNaira(r.partnerCommissions ?? 0)}) − expenses.
              Free gifts are already counted in the cost of goods.
            </p>
          </div>

          <h2 className="text-base font-bold text-white mb-3">Profit by product</h2>
          <div className="rounded-2xl border border-white/10 overflow-x-auto mb-10" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {r.products.length === 0 ? (
              <p className="p-5 text-sm text-white/45">No costed sales in this period yet.</p>
            ) : (
              <table className="w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="text-left text-white/40 uppercase tracking-wider text-[10px] border-b border-white/10">
                    <th className="p-3">Product</th>
                    <th className="p-3 text-right">Units</th>
                    <th className="p-3 text-right">Sales</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {r.products.map((p, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="p-3 text-white font-semibold">{p.name}</td>
                      <td className="p-3 text-right tabular-nums text-white/70">{p.units}</td>
                      <td className="p-3 text-right tabular-nums text-white/70">{formatNaira(p.revenue)}</td>
                      <td className="p-3 text-right tabular-nums text-white/70">{formatNaira(p.cost)}</td>
                      <td className={`p-3 text-right tabular-nums font-bold ${p.profit < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                        {formatNaira(p.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Expenses */}
      <h2 className="text-base font-bold text-white mb-1">Expenses</h2>
      <p className="text-xs text-white/45 mb-4">
        Record ads, packaging, transport and similar costs. Do not enter what you paid for stock here — that is
        already counted through each item&apos;s cost price.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (canSave) addMutation.mutate(); }}
        className="rounded-2xl border border-white/10 p-4 mb-5 grid grid-cols-2 md:grid-cols-[150px_160px_140px_1fr_auto] gap-3 items-end"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <label className="block">
          <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Date</span>
          <input type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Category</span>
          <select value={exCategory} onChange={(e) => setExCategory(e.target.value as ExpenseCategory)} className={inputCls}>
            {Object.entries(EXPENSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Amount (₦)</span>
          <input type="number" min={1} inputMode="numeric" value={exAmount}
            onChange={(e) => setExAmount(e.target.value)} className={inputCls} placeholder="30000" />
        </label>
        <label className="block col-span-2 md:col-span-1">
          <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Note (optional)</span>
          <input type="text" maxLength={200} value={exNote}
            onChange={(e) => setExNote(e.target.value)} className={inputCls} placeholder="TikTok ads" />
        </label>
        <button
          type="submit"
          disabled={!canSave}
          className="col-span-2 md:col-span-1 px-5 py-2.5 rounded-lg bg-primary text-black text-sm font-black disabled:opacity-40"
        >
          {addMutation.isPending ? 'Saving…' : 'Add expense'}
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 divide-y divide-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {(expenses.data ?? []).length === 0 && (
          <p className="p-5 text-sm text-white/45">No expenses recorded in this period.</p>
        )}
        {(expenses.data ?? []).map((ex) => (
          <div key={ex._id} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-semibold">
                {EXPENSE_LABELS[ex.category] ?? ex.category}
                {ex.note ? <span className="text-white/50 font-normal"> · {ex.note}</span> : null}
              </p>
              <p className="text-[11px] text-white/40">
                {new Date(ex.date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <p className="text-sm font-bold text-white tabular-nums">{formatNaira(ex.amount)}</p>
            <button
              type="button"
              aria-label="Delete expense"
              disabled={delMutation.isPending}
              onClick={() => { if (window.confirm('Remove this expense?')) delMutation.mutate(ex._id); }}
              className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AdminFrame>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-black text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}
