/** SC-STAFF2  /admin/expenses — record and review business expenses, export CSV. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { formatNaira } from '@/lib/format';
import { EXPENSE_LABELS, type ExpenseCategory } from '@/api/adminProfit';
import { addBookExpense, deleteBookExpense, downloadCsv, listBookExpenses } from '@/api/adminBooks';
import { PRESETS, presetRange, ymd, type Preset } from '@/lib/period';

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder:text-white/30';

export default function AdminExpenses() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState<Preset>('month');
  const [range, setRange] = useState(presetRange('month'));
  const [exDate, setExDate] = useState(ymd(new Date()));
  const [exCategory, setExCategory] = useState<ExpenseCategory>('ads');
  const [exAmount, setExAmount] = useState('');
  const [exNote, setExNote] = useState('');

  const choose = (p: Preset) => { setPreset(p); if (p !== 'custom') setRange(presetRange(p)); };
  const expenses = useQuery({
    queryKey: ['book-expenses', range.from, range.to],
    queryFn: () => listBookExpenses(range.from, range.to),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['book-expenses'] });

  const add = useMutation({
    mutationFn: () => addBookExpense({ date: exDate, category: exCategory, amount: Number(exAmount), note: exNote.trim() }),
    onSuccess: () => { toast.success('Expense saved'); setExAmount(''); setExNote(''); refresh(); },
    onError: (e: any) => toast.error(e?.message || 'Could not save the expense'),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteBookExpense(id),
    onSuccess: () => { toast.success('Expense removed'); refresh(); },
    onError: (e: any) => toast.error(e?.message || 'Could not remove the expense'),
  });

  const list = expenses.data ?? [];
  const total = list.reduce((t, e) => t + e.amount, 0);
  const byCat: Record<string, number> = {};
  list.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const canSave = Number(exAmount) > 0 && !add.isPending;

  return (
    <AdminFrame>
      <SEO title="Expenses" />
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Expenses</h1>
      <p className="text-sm text-white/45 mb-6">
        Ads, packaging, transport and similar costs. Do not enter what was paid for stock here.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => choose(p.id)}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
              preset === p.id ? 'bg-primary/15 border-primary/40 text-primary' : 'border-white/10 text-white/60 hover:border-white/25'}`}>
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={range.from} max={range.to} onChange={(e) => setRange((x) => ({ ...x, from: e.target.value }))} className={`${inputCls} w-auto`} />
            <span className="text-white/40 text-xs">to</span>
            <input type="date" value={range.to} min={range.from} onChange={(e) => setRange((x) => ({ ...x, to: e.target.value }))} className={`${inputCls} w-auto`} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (canSave) add.mutate(); }}
        className="rounded-2xl border border-white/10 p-4 mb-6 grid grid-cols-2 md:grid-cols-[150px_160px_140px_1fr_auto] gap-3 items-end"
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
          <input type="number" min={1} inputMode="numeric" value={exAmount} onChange={(e) => setExAmount(e.target.value)} className={inputCls} placeholder="30000" />
        </label>
        <label className="block col-span-2 md:col-span-1">
          <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Note (optional)</span>
          <input type="text" maxLength={200} value={exNote} onChange={(e) => setExNote(e.target.value)} className={inputCls} placeholder="TikTok ads" />
        </label>
        <button type="submit" disabled={!canSave} className="col-span-2 md:col-span-1 px-5 py-2.5 rounded-lg bg-primary text-black text-sm font-black disabled:opacity-40">
          {add.isPending ? 'Saving…' : 'Add expense'}
        </button>
      </form>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">Total in this period</p>
          <p className="text-2xl font-black text-white tabular-nums">{formatNaira(total)}</p>
          <p className="text-[11px] text-white/45 mt-1">
            {Object.entries(byCat).map(([k, v]) => `${EXPENSE_LABELS[k as ExpenseCategory] ?? k}: ${formatNaira(v)}`).join('  ·  ') || 'No expenses yet'}
          </p>
        </div>
        <button type="button"
          onClick={() => downloadCsv('expenses', range.from, range.to).catch((e) => toast.error(e?.message || 'Download failed'))}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:border-primary/40">
          <Download className="w-3.5 h-3.5" /> Download CSV
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 divide-y divide-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {list.length === 0 && <p className="p-5 text-sm text-white/45">No expenses recorded in this period.</p>}
        {list.map((ex) => (
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
            <button type="button" aria-label="Delete expense" disabled={del.isPending}
              onClick={() => { if (window.confirm('Remove this expense?')) del.mutate(ex._id); }}
              className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AdminFrame>
  );
}
