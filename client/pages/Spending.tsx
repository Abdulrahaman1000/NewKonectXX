/** SC-SPEND  /spending : what the customer spent on airtime, data, electricity, TV and exam pins, by month. */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { naira } from '@/components/vtu/brand';
import { hasCustomerToken } from '@/api/wallet';
import { myAllPurchases } from '@/api/spending';
import { setReturnTo } from '@/lib/customerSession';

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-white/70';
const SERVICES: { key: string; label: string; color: string }[] = [
  { key: 'airtime', label: 'Airtime', color: '#FFC828' },
  { key: 'data', label: 'Data', color: '#38BDF8' },
  { key: 'electricity', label: 'Electricity', color: '#FB923C' },
  { key: 'tv', label: 'Cable TV', color: '#A78BFA' },
  { key: 'exam', label: 'Exam pins', color: '#34D399' },
];
const MONTHS = 6;
const monthName = (d: Date, long = false) => d.toLocaleString('en-NG', { month: long ? 'long' : 'short' });

export default function Spending() {
  const signedIn = hasCustomerToken();
  const q = useQuery({ queryKey: ['my-all-purchases'], queryFn: myAllPurchases, enabled: signedIn, retry: false });
  const [back, setBack] = useState(0); // 0 = this month

  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, date: d, total: 0, count: 0, by: {} as Record<string, number>, buys: [] as string[] };
    });
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const o of q.data ?? []) {
      if (o.fulfilmentStatus !== 'successful') continue; // only what was actually delivered
      const d = new Date(o.createdAt);
      const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i === undefined) continue;
      const m = months[i]; m.total += o.amount; m.count += 1; m.by[o.service] = (m.by[o.service] ?? 0) + o.amount;
      m.buys.push(o.service === 'electricity' || o.service === 'tv' || o.service === 'exam' ? o.service : `${o.network} ${o.service}`);
    }
    return months;
  }, [q.data]);

  const sel = data[MONTHS - 1 - back];
  const prev = data[MONTHS - 2 - back];
  const max = Math.max(1, ...data.map((m) => m.total));
  const rows = SERVICES.map((s) => ({ ...s, amount: sel.by[s.key] ?? 0 })).filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);
  const usual = useMemo(() => {
    const c = new Map<string, number>(); sel.buys.forEach((b) => c.set(b, (c.get(b) ?? 0) + 1));
    const top = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
    return top && top[1] > 1 ? top : null;
  }, [sel]);
  const diff = prev ? sel.total - prev.total : 0;
  const ever = data.some((m) => m.count > 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="My spending | Smart Combo" description="See what you spend on airtime, data, electricity, TV and exam pins." />
      <Header />
      <CartDrawer />
      <main className="flex-1 section-padding py-8 md:py-12">
        <div className="container-premium max-w-lg">
          <h1 className="text-[28px] leading-tight font-black text-white">My spending</h1>
          <p className="text-sm text-white/60 mt-1">Airtime, data, electricity, TV and exam pins you bought here.</p>

          {!signedIn ? (
            <div className="mt-5 rounded-3xl border border-white/10 p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-white font-bold">Sign in to see your spending</p>
              <p className="text-sm text-white/60 mt-1">You will get a code by email. No password.</p>
              <Link to="/account" onClick={() => setReturnTo('/spending')} className={`mt-4 min-h-[52px] px-6 rounded-2xl bg-primary text-black font-black inline-flex items-center justify-center ${FOCUS}`}>Sign in</Link>
            </div>
          ) : q.isLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : q.isError ? (
            <p role="alert" className="mt-5 text-sm text-red-300">{(q.error as Error).message}</p>
          ) : !ever ? (
            <div className="mt-5 rounded-3xl border border-white/10 p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-white font-bold">Nothing to show yet</p>
              <p className="text-sm text-white/60 mt-1">Your spending appears here after your first purchase.</p>
              <Link to="/pay" className={`mt-4 min-h-[52px] px-6 rounded-2xl bg-primary text-black font-black inline-flex items-center justify-center ${FOCUS}`}>Buy airtime or data</Link>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {/* month total */}
              <div className="rounded-3xl p-5 border" style={{ borderColor: 'rgba(255,200,40,0.4)', background: 'linear-gradient(160deg, rgba(255,200,40,0.16), rgba(255,200,40,0.04))' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-white/70">Spent in {monthName(sel.date, true)}</p>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Earlier month" disabled={back >= MONTHS - 1} onClick={() => setBack(back + 1)} className={`w-11 h-11 -my-2 grid place-items-center rounded-full text-white/80 disabled:opacity-25 ${FOCUS}`}><ChevronLeft className="w-5 h-5" /></button>
                    <button type="button" aria-label="Later month" disabled={back <= 0} onClick={() => setBack(back - 1)} className={`w-11 h-11 -my-2 -mr-2 grid place-items-center rounded-full text-white/80 disabled:opacity-25 ${FOCUS}`}><ChevronRight className="w-5 h-5" /></button>
                  </div>
                </div>
                <p className="text-[40px] leading-[1.1] font-black text-primary tabular-nums mt-1">{naira(sel.total)}</p>
                <p className="text-[13px] text-white/65 mt-2">{sel.count} {sel.count === 1 ? 'purchase' : 'purchases'}
                  {prev && prev.total > 0 && sel.total > 0 && (
                    <span className={`ml-2 inline-flex items-center gap-1 font-bold ${diff > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {naira(Math.abs(diff))} {diff > 0 ? 'more' : 'less'} than {monthName(prev.date)}
                    </span>
                  )}
                </p>
                {usual && <p className="text-[13px] text-white/65 mt-1">You buy <span className="font-bold text-white">{usual[0]}</span> most ({usual[1]} times).</p>}
              </div>

              {/* by category */}
              <div className="rounded-3xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <h2 className="text-[15px] font-black text-white">Where it went</h2>
                {rows.length === 0 ? <p className="text-sm text-white/55 mt-2">No purchases in {monthName(sel.date, true)}.</p> : (
                  <ul className="mt-3 space-y-3.5">
                    {rows.map((r) => (
                      <li key={r.key}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-bold text-white inline-flex items-center gap-2"><span aria-hidden className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />{r.label}</span>
                          <span className="tabular-nums text-white"><span className="font-black">{naira(r.amount)}</span> <span className="text-white/50 text-xs">{Math.round((r.amount / sel.total) * 100)}%</span></span>
                        </div>
                        <div className="mt-1.5 h-2.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(3, (r.amount / sel.total) * 100)}%`, background: r.color }} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* last 6 months */}
              <div className="rounded-3xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <h2 className="text-[15px] font-black text-white">Last {MONTHS} months</h2>
                <div className="mt-4 flex items-end gap-2 h-36" role="group" aria-label="Spending by month">
                  {data.map((m, i) => {
                    const active = i === MONTHS - 1 - back;
                    return (
                      <button key={m.key} type="button" onClick={() => setBack(MONTHS - 1 - i)} aria-pressed={active} aria-label={`${monthName(m.date, true)}: ${naira(m.total)}`}
                        className={`flex-1 h-full flex flex-col justify-end items-center gap-1 rounded-lg ${FOCUS}`}>
                        <span className="text-[10px] tabular-nums text-white/60">{m.total > 0 ? (m.total >= 1000 ? `${Math.round(m.total / 100) / 10}k` : m.total) : ''}</span>
                        <span className="w-full rounded-t-md" style={{ height: `${m.total > 0 ? Math.max(6, (m.total / max) * 100) : 2}%`, background: active ? '#FFC828' : 'rgba(255,255,255,0.22)' }} />
                        <span className={`text-[11px] ${active ? 'text-primary font-bold' : 'text-white/55'}`}>{monthName(m.date)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Link to="/pay" className={`w-full min-h-[52px] rounded-2xl bg-primary text-black font-black text-[16px] inline-flex items-center justify-center ${FOCUS}`}>Buy airtime or data</Link>
              <p className="text-[12px] text-white/40 leading-relaxed">Only delivered purchases are counted. Store orders for watches, earpods and other gadgets are not included.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
