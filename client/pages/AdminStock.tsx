/** Stock levels, low-stock alerts and restock log. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { getStock, getStockLog, restock, setStock, type StockItem } from '@/api/adminStock';

const STATUS_STYLE = {
  out: 'bg-red-500/15 text-red-300 border-red-500/25',
  low: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
} as const;
const STATUS_LABEL = { out: 'Out of stock', low: 'Running low', ok: 'In stock' } as const;

type Filter = 'all' | 'attention' | 'ok' | 'log';

export default function AdminStock() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('attention');
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-stock'], queryFn: getStock });
  const { data: log = [] } = useQuery({ queryKey: ['admin-stock-log'], queryFn: getStockLog, enabled: filter === 'log' });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-stock'] });
    qc.invalidateQueries({ queryKey: ['admin-stock-log'] });
    qc.invalidateQueries({ queryKey: ['admin-stock-alerts'] });
    qc.invalidateQueries({ queryKey: ['admin-combos'] });
  };
  const onErr = (e: any) => toast.error(e?.message || 'Something went wrong');
  const add = useMutation({
    mutationFn: (v: { id: string; q: number; note: string }) => restock(v.id, v.q, v.note),
    onSuccess: () => { toast.success('Stock added'); refresh(); }, onError: onErr,
  });
  const set = useMutation({
    mutationFn: (v: { id: string; q: number; note: string }) => setStock(v.id, v.q, v.note),
    onSuccess: () => { toast.success('Stock count saved'); refresh(); }, onError: onErr,
  });

  const items = (data?.items ?? []).filter((i) => {
    if (search.trim() && !i.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filter === 'attention') return i.isActive && i.status !== 'ok';
    if (filter === 'ok') return i.status === 'ok';
    return true;
  });
  const attention = (data?.counts.out ?? 0) + (data?.counts.low ?? 0);

  return (
    <AdminFrame>
      <SEO title="Stock" />
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Stock</h1>
      <p className="text-sm text-white/45 mb-6">Low means {data?.lowAt ?? 3} or fewer left. Add stock when new goods arrive; every change is logged.</p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {([['attention', `Needs attention (${attention})`], ['all', 'All'], ['ok', 'In stock'], ['log', 'History']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-full text-xs font-bold border ${filter === k ? 'bg-primary text-black border-primary' : 'border-white/15 text-white/70 hover:bg-white/5'}`}>{label}</button>
        ))}
        {filter !== 'log' && (
          <div className="relative ml-auto">
            <Search className="w-3.5 h-3.5 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product"
              className="pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-primary/50" />
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-white/45 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}
      {error && <p className="text-sm text-red-300">Could not load stock.</p>}

      {filter === 'log' ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {log.length === 0 && <p className="text-sm text-white/45 p-6 text-center">No stock changes recorded yet.</p>}
          {log.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/5 last:border-0 text-xs">
              <div>
                <p className="font-bold text-white">{r.comboName}</p>
                <p className="text-white/40">{new Date(r.createdAt).toLocaleString('en-GB')}{r.note ? ` · ${r.note}` : ''}</p>
              </div>
              <p className="text-white/70">
                {r.kind === 'set' ? 'Count set: ' : 'Added: '}
                <b className={r.delta >= 0 ? 'text-emerald-300' : 'text-red-300'}>{r.delta >= 0 ? '+' : ''}{r.delta}</b>
                <span className="text-white/40"> ({r.before} → {r.after})</span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-white/45 py-10 text-center">{filter === 'attention' ? 'Nothing is low or out of stock.' : 'No products found.'}</p>
          )}
          {items.map((i) => (
            <StockRow key={i.id} item={i} busy={add.isPending || set.isPending}
              onAdd={(q, note) => add.mutate({ id: i.id, q, note })}
              onSet={(q, note) => set.mutate({ id: i.id, q, note })} />
          ))}
        </div>
      )}
    </AdminFrame>
  );
}

function StockRow({ item, busy, onAdd, onSet }: { item: StockItem; busy: boolean; onAdd: (q: number, note: string) => void; onSet: (q: number, note: string) => void }) {
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const n = Math.floor(Number(qty));
  const valid = qty.trim() !== '' && Number.isFinite(n);
  const input = 'px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-primary/50';
  return (
    <article className="rounded-2xl border border-white/10 p-4 flex flex-wrap items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', opacity: item.isActive ? 1 : 0.6 }}>
      <div className="flex items-center gap-3 min-w-[220px] flex-1">
        {item.image ? <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/5" /> : <div className="w-12 h-12 rounded-lg bg-white/5" />}
        <div>
          <p className="text-sm font-bold text-white">{item.name}{!item.isActive && <span className="ml-2 text-[10px] text-white/40">(hidden)</span>}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
        </div>
      </div>
      <p className="text-3xl font-black text-white tabular-nums w-16 text-center">{item.stockLeft}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${input} w-20`} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Qty" />
        <input className={`${input} w-36`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={200} />
        <button type="button" disabled={busy || !valid || n < 1} onClick={() => { onAdd(n, note); setQty(''); setNote(''); }}
          className="px-3 py-2 rounded-lg bg-primary text-black text-xs font-black disabled:opacity-40">Add stock</button>
        <button type="button" disabled={busy || !valid} onClick={() => { onSet(n, note); setQty(''); setNote(''); }}
          className="px-3 py-2 rounded-lg border border-white/15 text-xs font-bold text-white/80 hover:bg-white/5 disabled:opacity-40" title="Replace the count with this exact number">Set count</button>
      </div>
    </article>
  );
}
