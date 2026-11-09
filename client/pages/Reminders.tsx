/** SC-REM  /reminders : renewal reminders (change days, pause, delete, Buy again) and the low-wallet alert. */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Loader2, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { naira } from '@/components/vtu/brand';
import { hasCustomerToken } from '@/api/wallet';
import { changeReminder, deleteReminder, dueText, getReminders, setLowBalance, type Reminder } from '@/api/reminders';
import { savePayDraft, setReturnTo } from '@/lib/customerSession';

const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-white/70';
const DAYS = [7, 14, 30, 60, 90];
const chip = (s: Reminder['state']) => s === 'due' ? 'text-primary' : s === 'soon' ? 'text-amber-200' : s === 'paused' ? 'text-white/40' : 'text-white/60';

export default function Reminders() {
  const signedIn = hasCustomerToken();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['reminders'], queryFn: getReminders, enabled: signedIn, retry: false });
  const [low, setLow] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => { if (q.data) setLow(q.data.lowBalance ? String(q.data.lowBalance) : ''); }, [q.data?.lowBalance]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); await qc.invalidateQueries({ queryKey: ['reminders'] }); if (done) setMsg({ ok: true, text: done }); } catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  };
  const buyAgain = (r: Reminder) => { savePayDraft(r.draft); nav('/pay'); };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="My reminders | Smart Combo" description="Renewal reminders and wallet alerts." />
      <Header />
      <CartDrawer />
      <main className="flex-1 section-padding py-8 md:py-12">
        <div className="container-premium max-w-lg">
          <h1 className="text-[28px] leading-tight font-black text-white">My reminders</h1>
          <p className="text-sm text-white/60 mt-1">We remind you here when it is time to renew. We never buy anything for you. You tap Buy again.</p>

          {!signedIn ? (
            <div className="mt-5 rounded-3xl border border-white/10 p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-white font-bold">Sign in to see your reminders</p>
              <Link to="/account" onClick={() => setReturnTo('/reminders')} className={`mt-4 min-h-[52px] px-6 rounded-2xl bg-primary text-black font-black inline-flex items-center justify-center ${FOCUS}`}>Sign in</Link>
            </div>
          ) : q.isLoading ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          : q.isError ? <p role="alert" className="mt-5 text-sm text-red-300">{(q.error as Error).message}</p>
          : (
            <div className="mt-5 space-y-5">
              {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</p>}

              {q.data!.reminders.length === 0 ? (
                <div className="rounded-3xl border border-white/10 p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <BellRing className="w-8 h-8 text-primary mx-auto" />
                  <p className="text-white font-bold mt-3">No reminders yet</p>
                  <p className="text-sm text-white/60 mt-1">After you buy airtime, data, electricity or TV, tap “Remind me to renew” on the receipt page.</p>
                  <Link to="/pay" className={`mt-4 min-h-[52px] px-6 rounded-2xl bg-primary text-black font-black inline-flex items-center justify-center ${FOCUS}`}>Go to Pay bills</Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {q.data!.reminders.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <p className="text-[15px] font-black text-white break-words">{r.label}</p>
                      <p className={`text-[13px] font-bold mt-0.5 ${chip(r.state)}`}>{dueText(r)}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="text-[13px] text-white/70 inline-flex items-center gap-2">Every
                          <select value={DAYS.includes(r.everyDays) ? r.everyDays : 'x'} disabled={!!busy} onChange={(e) => run(r.id, () => changeReminder(r.id, { everyDays: Number(e.target.value) }))}
                            className={`min-h-[44px] rounded-xl bg-black/40 border border-white/15 px-3 text-white ${FOCUS}`}>
                            {!DAYS.includes(r.everyDays) && <option value="x" disabled>{r.everyDays}</option>}
                            {DAYS.map((d) => <option key={d} value={d}>{d} days</option>)}
                          </select>
                        </label>
                        <button type="button" disabled={!!busy} onClick={() => run(r.id, () => changeReminder(r.id, { paused: !r.paused }))} className={`min-h-[44px] px-4 rounded-xl border border-white/15 text-[13px] font-bold text-white/85 ${FOCUS}`}>{r.paused ? 'Turn on' : 'Pause'}</button>
                        <button type="button" disabled={!!busy} aria-label={`Delete reminder for ${r.label}`} onClick={() => run(r.id, () => deleteReminder(r.id), 'Reminder deleted.')} className={`min-h-[44px] min-w-[44px] grid place-items-center rounded-xl border border-white/15 text-white/70 ${FOCUS}`}><Trash2 className="w-4 h-4" /></button>
                        <button type="button" onClick={() => buyAgain(r)} className={`ml-auto min-h-[44px] px-4 rounded-xl bg-primary text-black text-[13px] font-black ${FOCUS}`}>Buy again</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-3xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <label htmlFor="low" className="text-[15px] font-black text-white">Low wallet alert</label>
                <p className="text-[13px] text-white/60 mt-1">Tell me when my wallet drops below this amount. Leave empty to switch it off.</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-2xl border border-white/15 bg-black/30 px-4 h-12 focus-within:border-primary">
                    <span className="font-black text-white/50">₦</span>
                    <input id="low" inputMode="numeric" placeholder="e.g. 1,000" value={low} onChange={(e) => setLow(e.target.value.replace(/\D/g, ''))} className="w-full bg-transparent text-lg font-black text-white tabular-nums placeholder-white/25 outline-none" />
                  </div>
                  <button type="button" disabled={!!busy} onClick={() => run('low', () => setLowBalance(Number(low || 0)), low ? `You will be told when your wallet is below ${naira(Number(low))}.` : 'Low wallet alert is off.')} className={`min-h-[48px] px-5 rounded-2xl bg-primary text-black font-black disabled:opacity-50 ${FOCUS}`}>Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
