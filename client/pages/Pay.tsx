/**
 * SC-VTU  /pay : buy airtime, data or electricity. No wallet: the customer pays for each purchase through Paystack.
 * The price shown here is only a preview. The server works out the real price again before payment.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { checkMeter, getCatalog, getPlans, startPurchase, type Plan, type Service } from '@/api/vtu';

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
const inputCls = 'w-full min-h-[48px] rounded-xl bg-white/5 border border-white/15 px-4 text-white placeholder-white/35 outline-none focus:border-primary';
const chip = (on: boolean) => `min-h-[44px] px-3 rounded-xl border text-sm font-bold ${on ? 'border-primary bg-primary/15 text-primary' : 'border-white/15 bg-white/5 text-white/80'}`;
const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};
const TABS: Array<{ k: Service | 'tv'; label: string }> = [
  { k: 'airtime', label: 'Airtime' }, { k: 'data', label: 'Data' }, { k: 'electricity', label: 'Electricity' }, { k: 'tv', label: 'TV' },
];
const QUICK_AIRTIME = [100, 200, 500, 1000, 2000, 5000];
const QUICK_POWER = [1000, 2000, 5000, 10000];

export default function Pay() {
  const [params] = useSearchParams();
  const first = params.get('tab');
  const [tab, setTab] = useState<Service>(first === 'data' || first === 'electricity' ? first : 'airtime');
  const [network, setNetwork] = useState('MTN');
  const [phone, setPhone] = useState(store.get('sc_vtu_phone'));
  const [email, setEmail] = useState(store.get('sc_vtu_email'));
  const [amount, setAmount] = useState<number | ''>('');
  const [cat, setCat] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [planCode, setPlanCode] = useState('');
  const [disco, setDisco] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [meter, setMeter] = useState('');
  const [meterInfo, setMeterInfo] = useState<{ name?: string; address?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const { data: catalog, isLoading } = useQuery({ queryKey: ['vtu-catalog'], queryFn: getCatalog, retry: false });
  const plansQ = useQuery({ queryKey: ['vtu-plans', network], queryFn: () => getPlans(network), enabled: tab === 'data' && !!catalog?.enabled, retry: false });
  const plans: Plan[] = plansQ.data ?? [];
  const shown = plans.filter((p) => p.category === cat);
  const plan = plans.find((p) => p.code === planCode);

  useEffect(() => { setPlanCode(''); }, [network, cat, tab]);
  useEffect(() => { setMeterInfo(null); }, [disco, meterType, meter]);
  useEffect(() => { setErr(''); }, [tab, network, amount, planCode, disco, meter]);

  const fee = catalog?.electricity.fee ?? 0;
  const total = useMemo(() => {
    if (tab === 'data') return plan?.price ?? 0;
    if (tab === 'airtime') return amount ? Number(amount) : 0;
    return amount ? Number(amount) + fee : 0;
  }, [tab, plan, amount, fee]);

  const verify = async () => {
    setBusy(true); setErr('');
    try {
      const r = await checkMeter(disco, meterType, meter);
      if (!r.ok) throw new Error(r.message || 'We could not verify that meter.');
      setMeterInfo({ name: r.name, address: r.address });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const pay = async () => {
    setBusy(true); setErr('');
    try {
      if (tab === 'electricity' && !meterInfo) throw new Error('Please verify the meter first.');
      store.set('sc_vtu_phone', phone); store.set('sc_vtu_email', email);
      const r = await startPurchase({ service: tab, network, phone, email, amount: amount || undefined, planCode: planCode || undefined, disco, meterType, meter });
      window.location.href = r.authorizationUrl;
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  const ready = tab === 'data' ? !!plan && phone.length >= 11 : tab === 'airtime' ? !!amount && phone.length >= 11 : !!amount && !!meterInfo;
  const off = !isLoading && !catalog?.enabled;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Recharge & pay bills | Smart Combo" description="Buy airtime, data and electricity. Pay for each purchase, no wallet needed." />
      <Header />
      <CartDrawer />
      <main className="flex-1 section-padding py-8 md:py-12">
        <div className="container-premium max-w-lg">
          <h1 className="text-2xl font-black text-white mb-1">Pay bills</h1>
          <p className="text-sm text-white/60 mb-5">Pay for each purchase. No wallet, no sign-up.</p>

          {catalog?.simulated && <p className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">Test mode: nothing real is sent and no airtime is delivered.</p>}
          {isLoading && <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>}
          {off && <p className="rounded-2xl border border-white/10 p-5 text-sm text-white/75">Recharge is coming soon. Please check back shortly.</p>}

          {catalog?.enabled && (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 p-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {TABS.map((t) => (
                  <button key={t.k} type="button" disabled={t.k === 'tv'} onClick={() => t.k !== 'tv' && setTab(t.k)}
                    className={`min-h-[44px] rounded-xl text-[13px] font-bold ${tab === t.k ? 'bg-primary text-black' : 'text-white/70'} ${t.k === 'tv' ? 'opacity-40' : ''}`}>
                    {t.label}{t.k === 'tv' && <span className="block text-[9px] font-normal">soon</span>}
                  </button>
                ))}
              </div>

              {tab !== 'electricity' && (
                <section>
                  <p className="text-sm font-bold text-white/80 mb-2">Network</p>
                  <div className="grid grid-cols-4 gap-2">
                    {catalog.networks.map((n) => <button key={n} type="button" className={chip(network === n)} onClick={() => setNetwork(n)}>{n}</button>)}
                  </div>
                </section>
              )}

              {tab !== 'electricity' && (
                <section>
                  <p className="text-sm font-bold text-white/80 mb-2">Phone number</p>
                  <input className={inputCls} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 111 2222" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </section>
              )}

              {tab === 'airtime' && (
                <section>
                  <p className="text-sm font-bold text-white/80 mb-2">Amount</p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {QUICK_AIRTIME.map((a) => <button key={a} type="button" className={chip(amount === a)} onClick={() => setAmount(a)}>{naira(a)}</button>)}
                  </div>
                  <input className={inputCls} type="number" inputMode="numeric" placeholder={`Other amount (${naira(catalog.airtime.min)} to ${naira(catalog.airtime.max)})`} value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} />
                </section>
              )}

              {tab === 'data' && (
                <section>
                  <div className="flex gap-2 mb-3">
                    {(['daily', 'weekly', 'monthly'] as const).map((c) => <button key={c} type="button" className={chip(cat === c) + ' capitalize'} onClick={() => setCat(c)}>{c}</button>)}
                  </div>
                  {plansQ.isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  {plansQ.isError && <p className="text-sm text-red-400">We could not load the plans. Please try again.</p>}
                  <div className="grid grid-cols-2 gap-2">
                    {shown.map((p) => (
                      <button key={p.code} type="button" onClick={() => setPlanCode(p.code)}
                        className={`text-left rounded-2xl border p-3 min-h-[84px] ${planCode === p.code ? 'border-primary bg-primary/10' : 'border-white/15 bg-white/5'}`}>
                        <p className="text-base font-black text-white">{p.name.split(' (')[0]}</p>
                        <p className="text-xs text-white/55">{p.validity}</p>
                        <p className="text-sm font-black text-primary mt-1">{naira(p.price)}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {tab === 'electricity' && (
                <section className="space-y-3">
                  <select className={inputCls} value={disco} onChange={(e) => setDisco(e.target.value)}>
                    <option value="">Choose your electricity company</option>
                    {catalog.electricity.discos.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    {(['prepaid', 'postpaid'] as const).map((t) => <button key={t} type="button" className={chip(meterType === t) + ' capitalize'} onClick={() => setMeterType(t)}>{t}</button>)}
                  </div>
                  <div className="flex gap-2">
                    <input className={inputCls} inputMode="numeric" placeholder="Meter number" value={meter} onChange={(e) => setMeter(e.target.value.replace(/\D/g, ''))} />
                    <button type="button" disabled={busy || !disco || meter.length < 8} onClick={verify} className="min-h-[48px] px-4 rounded-xl border border-primary text-primary font-bold disabled:opacity-40">Verify</button>
                  </div>
                  {meterInfo && <p className="text-sm text-emerald-300 inline-flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><span>{meterInfo.name}{meterInfo.address ? ` · ${meterInfo.address}` : ''}</span></p>}
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_POWER.map((a) => <button key={a} type="button" className={chip(amount === a)} onClick={() => setAmount(a)}>{naira(a)}</button>)}
                  </div>
                  <input className={inputCls} type="number" inputMode="numeric" placeholder={`Other amount (${naira(catalog.electricity.min)} to ${naira(catalog.electricity.max)})`} value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} />
                  <input className={inputCls} type="tel" inputMode="tel" placeholder="Phone number (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  {fee > 0 && <p className="text-xs text-white/55">Service fee {naira(fee)} is added to the amount.</p>}
                </section>
              )}

              <section>
                <p className="text-sm font-bold text-white/80 mb-2">Your email</p>
                <input className={inputCls} type="email" inputMode="email" autoComplete="email" placeholder="For your receipt" value={email} onChange={(e) => setEmail(e.target.value)} />
              </section>

              {err && <p className="text-sm text-red-400">{err}</p>}
              <button type="button" onClick={pay} disabled={busy || !ready || !email}
                className="w-full min-h-[52px] rounded-2xl bg-primary text-black font-black text-base disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} {total ? `Pay ${naira(total)}` : 'Pay'}
              </button>
              <p className="text-xs text-white/50 leading-relaxed">You pay for this purchase only, through Paystack. If it does not go through, you are refunded.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
