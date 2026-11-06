/**
 * SC-VTU / SC-UI  /pay : buy airtime, data or electricity. No wallet: the customer pays for each purchase through Paystack.
 * The price shown here is only a preview. The server works out the real price again before payment.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BadgeCheck, Check, CreditCard, Loader2, Lock, Mail, Minus, Plus, RotateCcw, ShieldCheck, Smartphone, Timer, Zap, Wallet, type LucideIcon } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { NetworkDot, SERVICES, ServiceBadge, naira, serviceLook } from '@/components/vtu/brand';
import { PaySheet } from '@/components/vtu/PaySheet';
import { getWallet, hasCustomerToken } from '@/api/wallet';
import { Link } from 'react-router-dom';
import { savePayDraft, setReturnTo, takePayDraft } from '@/lib/customerSession';
import { checkCard, checkMeter, getBouquets, getCatalog, getExamProducts, getPlans, startPurchase, type Plan, type Service } from '@/api/vtu';

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};
const QUICK_AIRTIME = [100, 200, 500, 1000, 2000, 5000];
const QUICK_POWER = [1000, 2000, 5000, 10000];
const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/70';
const surface = { background: 'rgba(255,255,255,0.035)' } as const;
const inputBase = `w-full h-[52px] rounded-xl bg-white/5 border border-white/10 pr-4 text-[15px] text-white placeholder-white/30 focus:border-primary/70 ${FOCUS}`;

/** Pulls "10 GB" out of a plan name such as "N3500 10GB - 30 days" or "2 GB (7 days)". */
const sizeOf = (name: string) => {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)\b/i);
  return m ? { n: m[1], u: m[2].toUpperCase() } : null;
};
const plainName = (name: string) => name.replace(/^(MTN|Airtel|Glo|9mobile)\s+/i, '').replace(/\bN\d[\d,]*\s*/i, '').trim() || name;
const validityOf = (p: Plan) => p.validity || (p.name.split(/\s-\s/)[1] ?? '');

function Label({ children }: { children: ReactNode }) { return <p className="text-[13px] font-bold text-white/75 mb-2">{children}</p>; }

function Field({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="relative">
      <Icon aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/35 pointer-events-none" />
      {children}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ v: T; label: string; sub?: string }> }) {
  return (
    <div className="grid gap-1 rounded-xl border border-white/10 p-1" style={{ ...surface, gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} aria-pressed={value === o.v}
          className={`min-h-[42px] rounded-lg text-[13px] font-bold motion-safe:transition-colors ${FOCUS} ${value === o.v ? 'bg-primary text-black' : 'text-white/70 hover:text-white'}`}>
          {o.label}{o.sub ? <span className={`ml-1 text-[11px] font-semibold ${value === o.v ? 'text-black/60' : 'text-white/40'}`}>{o.sub}</span> : null}
        </button>
      ))}
    </div>
  );
}

const pill = (on: boolean) =>
  `min-h-[46px] rounded-xl border text-[14px] font-bold tabular-nums motion-safe:transition-colors ${FOCUS} ${on ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-white/5 text-white/85 hover:border-white/25'}`;

export default function Pay() {
  const [params] = useSearchParams();
  const first = params.get('tab');
  const [tab, setTab] = useState<Service>(first === 'data' || first === 'electricity' || first === 'tv' || first === 'exam' ? first : 'airtime');
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
  const [operator, setOperator] = useState('');
  const [card, setCard] = useState('');
  const [cardInfo, setCardInfo] = useState<{ name?: string; status?: string; dueDate?: string } | null>(null);
  const [bouquetCode, setBouquetCode] = useState('');
  const [exam, setExam] = useState('');
  const [productCode, setProductCode] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const signedIn = hasCustomerToken();
  const walletQ = useQuery({ queryKey: ['wallet'], queryFn: getWallet, enabled: signedIn, retry: false });

  // Put back a form that was saved while the customer signed in or topped up the wallet.
  useEffect(() => {
    const d = takePayDraft(); if (!d) return;
    if (d.tab) setTab(d.tab); if (d.network) setNetwork(d.network); if (d.phone) setPhone(d.phone); if (d.email) setEmail(d.email);
    if (d.amount) setAmount(Number(d.amount)); if (d.cat) setCat(d.cat); if (d.planCode) setPlanCode(d.planCode);
    if (d.disco) setDisco(d.disco); if (d.meterType) setMeterType(d.meterType); if (d.meter) setMeter(d.meter);
    if (d.operator) setOperator(d.operator); if (d.card) setCard(d.card); if (d.bouquetCode) setBouquetCode(d.bouquetCode);
    if (d.exam) setExam(d.exam); if (d.productCode) setProductCode(d.productCode); if (d.qty) setQty(Number(d.qty));
  }, []);
  const leaveForWallet = () => {
    savePayDraft({ tab, network, phone, email, amount, cat, planCode, disco, meterType, meter, operator, card, bouquetCode, exam, productCode, qty });
    setReturnTo('/pay');
  };
  const [err, setErr] = useState('');

  const { data: catalog, isLoading } = useQuery({ queryKey: ['vtu-catalog'], queryFn: getCatalog, retry: false });
  const plansQ = useQuery({ queryKey: ['vtu-plans', network], queryFn: () => getPlans(network), enabled: tab === 'data' && !!catalog?.enabled, retry: false });
  const bouquetsQ = useQuery({ queryKey: ['vtu-tv', operator], queryFn: () => getBouquets(operator), enabled: tab === 'tv' && !!operator, retry: false });
  const productsQ = useQuery({ queryKey: ['vtu-exam', exam], queryFn: () => getExamProducts(exam), enabled: tab === 'exam' && !!exam, retry: false });
  const bouquets = bouquetsQ.data ?? [];
  const products = productsQ.data ?? [];
  const bouquet = bouquets.find((b) => b.code === bouquetCode);
  const product = products.find((p) => p.code === productCode);
  const plans: Plan[] = plansQ.data ?? [];
  const shown = plans.filter((p) => p.category === cat);
  const plan = plans.find((p) => p.code === planCode);
  const count = (c: string) => plans.filter((p) => p.category === c).length;

  useEffect(() => { setPlanCode(''); }, [network, cat, tab]);
  // Only the services this provider sells are shown. TV and exam pins appear when the catalog lists them.
  const offered: Service[] = ['airtime', 'data', 'electricity', ...(catalog?.tv ? ['tv' as const] : []), ...(catalog?.exam ? ['exam' as const] : [])];
  useEffect(() => { if (catalog && !offered.includes(tab)) setTab('airtime'); }, [catalog, tab]);
  useEffect(() => { if (catalog?.tv && !operator) setOperator(catalog.tv.operators[0]?.code ?? ''); }, [catalog, operator]);
  useEffect(() => { if (catalog?.exam && !exam) setExam(catalog.exam.types[0]?.code ?? ''); }, [catalog, exam]);
  useEffect(() => { setBouquetCode(''); }, [operator, tab]);
  useEffect(() => { setCardInfo(null); }, [operator, card]);
  useEffect(() => { setProductCode(''); setQty(1); }, [exam, tab]);
  useEffect(() => { if (tab === 'exam' && products.length === 1 && !productCode) setProductCode(products[0].code); }, [tab, products, productCode]);
  useEffect(() => { setMeterInfo(null); }, [disco, meterType, meter]);
  useEffect(() => { setErr(''); }, [tab, network, amount, planCode, disco, meter, operator, card, bouquetCode, exam, productCode, qty]);
  // If the chosen group has no plans (for example no daily plans), move to one that has.
  useEffect(() => {
    if (tab === 'data' && plans.length && !plans.some((p) => p.category === cat)) {
      const next = (['weekly', 'monthly', 'daily'] as const).find((c) => plans.some((p) => p.category === c));
      if (next) setCat(next);
    }
  }, [plans, tab, cat]);

  const fee = catalog?.electricity.fee ?? 0;
  const examFee = catalog?.exam?.fee ?? 0;
  const base = tab === 'data' ? plan?.price ?? 0 : tab === 'tv' ? bouquet?.price ?? 0 : tab === 'exam' ? (product?.price ?? 0) * qty : amount ? Number(amount) : 0;
  const extraFee = tab === 'electricity' ? fee : tab === 'exam' ? examFee : 0; // TV prices already include the TV fee
  const total = base ? base + extraFee : 0;
  const operatorName = catalog?.tv?.operators.find((o) => o.code === operator)?.name ?? '';
  const examName = catalog?.exam?.types.find((t) => t.code === exam)?.name ?? '';
  const discoName = catalog?.electricity.discos.find((d) => d.code === disco)?.name ?? '';

  const verify = async () => {
    setBusy(true); setErr('');
    try {
      const r = await checkMeter(disco, meterType, meter);
      if (!r.ok) throw new Error(r.message || 'We could not verify that meter.');
      setMeterInfo({ name: r.name, address: r.address });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const verifyCardNow = async () => {
    setBusy(true); setErr('');
    try {
      const r = await checkCard(operator, card);
      if (!r.ok) throw new Error(r.message || 'We could not verify that smartcard.');
      setCardInfo({ name: r.name, status: r.status, dueDate: r.dueDate });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  // What is still missing, in the order the person fills it in. Empty means ready to pay.
  const missing = (() => {
    const phoneOk = phone.replace(/\D/g, '').length >= 11;
    if (tab === 'airtime') { if (!phoneOk) return 'Enter the phone number'; if (!amount) return 'Choose an amount'; }
    if (tab === 'data') { if (!phoneOk) return 'Enter the phone number'; if (!plan) return 'Choose a data plan'; }
    if (tab === 'electricity') {
      if (!disco) return 'Choose your electricity company';
      if (meter.length < 8) return 'Enter the meter number';
      if (!meterInfo) return 'Verify the meter';
      if (!amount) return 'Choose an amount';
      if (!phoneOk) return 'Enter a phone number for the token details';
    }
    if (tab === 'tv') {
      if (card.length < 8) return 'Enter the smartcard number';
      if (!cardInfo) return 'Verify the smartcard';
      if (!bouquet) return 'Choose a bouquet';
      if (!phoneOk) return 'Enter your phone number';
    }
    if (tab === 'exam') {
      if (!product) return 'Choose a product';
      if (!phoneOk) return 'Enter your phone number';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'Enter your email for the receipt';
    return '';
  })();

  const pay = async (via: 'card' | 'wallet' = 'card') => {
    setBusy(true); setErr('');
    try {
      if (tab === 'electricity' && !meterInfo) throw new Error('Please verify the meter first.');
      if (tab === 'tv' && !cardInfo) throw new Error('Please verify the smartcard first.');
      store.set('sc_vtu_phone', phone); store.set('sc_vtu_email', email);
      const body: Record<string, unknown> =
        tab === 'tv' ? { service: 'tv', network: operator, card, planCode: bouquetCode, phone, email }
        : tab === 'exam' ? { service: 'exam', network: exam, planCode: productCode, quantity: qty, phone, email }
        : { service: tab, network, phone, email, amount: amount || undefined, planCode: planCode || undefined, disco, meterType, meter };
      if (via === 'wallet') body.payWith = 'wallet';
      const r = await startPurchase(body);
      window.location.href = r.paidFromWallet ? `/pay/result?reference=${encodeURIComponent(r.reference)}` : r.authorizationUrl;
    } catch (e: any) { setErr(e.message); setBusy(false); setSheet(false); }
  };

  const off = !isLoading && !catalog?.enabled;
  const look = serviceLook(tab);
  const size = plan ? sizeOf(plan.name) : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Recharge & pay bills | Smart Combo" description="Buy airtime, data, electricity, TV and exam pins. Pay direct or from your Smart Combo wallet." />
      <Header />
      <CartDrawer />
      <main className="flex-1 section-padding py-8 md:py-12">
        <div className="container-premium max-w-lg">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h1 className="text-[28px] leading-tight font-black text-white">Pay bills</h1>
              <p className="text-sm text-white/60 mt-1">Airtime, data, electricity, TV and exam pins. Pay direct with no account, or use your wallet.</p>
            </div>
            {catalog?.simulated && <span className="shrink-0 mt-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-200">Test mode</span>}
          </div>
          {catalog?.simulated && <p className="-mt-2 mb-5 text-xs text-amber-200/80">Nothing real is sent and no airtime is delivered.</p>}

          {/* wallet balance, always in view */}
          {signedIn ? (
            <Link to="/wallet" onClick={leaveForWallet} className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 min-h-[56px] ${FOCUS}`} style={{ borderColor: 'rgba(255,200,40,0.4)', background: 'rgba(255,200,40,0.08)' }}>
              <Wallet className="w-5 h-5 text-primary shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] text-white/60 leading-tight">Wallet balance</span>
                <span className="block text-[17px] font-black text-primary tabular-nums leading-tight">{walletQ.data ? naira(walletQ.data.balance) : walletQ.isLoading ? '…' : '₦0'}</span>
              </span>
              <span className="text-[13px] font-black text-white">Add money ›</span>
            </Link>
          ) : (
            <Link to="/account" onClick={() => setReturnTo('/pay')} className={`mb-5 flex items-center gap-3 rounded-2xl border border-white/15 px-4 min-h-[56px] ${FOCUS}`} style={surface}>
              <Wallet className="w-5 h-5 text-primary shrink-0" />
              <span className="flex-1 text-[13px] text-white/75 leading-snug">Have a wallet? Sign in to see your balance.</span>
              <span className="text-[13px] font-black text-primary">Sign in ›</span>
            </Link>
          )}

          {isLoading && <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>}
          {off && <p className="rounded-2xl border border-white/10 p-5 text-sm text-white/75" style={surface}>Recharge is coming soon. Please check back shortly.</p>}

          {catalog?.enabled && (
            <div className="space-y-4">
              {/* The services this provider sells */}
              {(() => {
                const tiles = SERVICES.filter((x) => offered.includes(x.k as Service));
                const tight = tiles.length > 4;
                return (
                  <div className={`grid ${tight ? 'gap-1.5' : 'gap-2'}`} style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0,1fr))` }} role="tablist" aria-label="What do you want to buy">
                    {tiles.map((x) => {
                      const on = tab === x.k;
                      return (
                        <button key={x.k} type="button" role="tab" aria-selected={on} onClick={() => setTab(x.k as Service)}
                          className={`flex flex-col items-center rounded-2xl border px-0.5 pt-3 pb-2.5 motion-safe:transition-colors ${tight ? 'gap-1.5 min-h-[88px]' : 'gap-2 min-h-[96px]'} ${FOCUS} ${on ? 'border-transparent' : 'border-white/10 hover:border-white/25'}`}
                          style={on ? { background: x.soft, boxShadow: `inset 0 0 0 1.5px ${x.tint}` } : surface}>
                          <ServiceBadge k={x.k} size={tight ? 40 : 48} solid={on} />
                          <span className={`${tight ? 'text-[11.5px]' : 'text-[12.5px]'} font-bold leading-tight text-center ${on ? 'text-white' : 'text-white/75'}`}>{x.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="rounded-3xl border border-white/10 p-4 md:p-5 space-y-5" style={surface}>
                {(tab === 'airtime' || tab === 'data') && (
                  <section>
                    <Label>Network</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {catalog.networks.map((n) => {
                        const on = network === n;
                        return (
                          <button key={n} type="button" aria-pressed={on} onClick={() => setNetwork(n)}
                            className={`relative flex flex-col items-center gap-1.5 rounded-xl border py-2.5 min-h-[76px] motion-safe:transition-colors ${FOCUS} ${on ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                            <NetworkDot name={n} size={34} />
                            <span className={`text-[12px] font-bold ${on ? 'text-primary' : 'text-white/80'}`}>{n}</span>
                            {on && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-black grid place-items-center"><Check className="w-2.5 h-2.5" strokeWidth={3.5} /></span>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {(tab === 'airtime' || tab === 'data') && (
                  <section>
                    <Label>Phone number</Label>
                    <Field icon={Smartphone}>
                      <input className={inputBase + ' pl-11'} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 111 2222" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </Field>
                  </section>
                )}

                {tab === 'airtime' && (
                  <section>
                    <Label>Amount</Label>
                    <div className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-primary/70`}>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[30px] font-black text-white/35 leading-none">₦</span>
                        <input aria-label="Amount in naira" className={`w-full bg-transparent text-[40px] leading-[1.1] font-black text-white tabular-nums placeholder-white/20 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                          type="number" inputMode="numeric" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} />
                      </div>
                      <p className="text-xs text-white/45 mt-1">From {naira(catalog.airtime.min)} to {naira(catalog.airtime.max)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {QUICK_AIRTIME.map((a) => <button key={a} type="button" className={pill(amount === a)} onClick={() => setAmount(a)}>{naira(a)}</button>)}
                    </div>
                  </section>
                )}

                {tab === 'data' && (
                  <section>
                    <Label>Choose a data plan</Label>
                    <Seg value={cat} onChange={setCat} options={(['daily', 'weekly', 'monthly'] as const).map((c) => ({ v: c, label: c[0].toUpperCase() + c.slice(1), sub: plans.length ? String(count(c)) : '' }))} />
                    <div className="mt-3">
                      {plansQ.isLoading && <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>}
                      {plansQ.isError && <p className="text-sm text-red-300 rounded-xl border border-red-400/30 bg-red-500/10 p-3">We could not load the plans. Check your connection and try again in a moment.</p>}
                      {!plansQ.isLoading && !plansQ.isError && shown.length === 0 && <p className="text-sm text-white/55 py-4 text-center">No plans in this group right now. Try another.</p>}
                      <div className="grid grid-cols-2 gap-2.5">
                        {shown.map((p) => {
                          const sz = sizeOf(p.name); const on = planCode === p.code; const v = validityOf(p);
                          return (
                            <button key={p.code} type="button" aria-pressed={on} onClick={() => setPlanCode(p.code)}
                              className={`relative text-left rounded-2xl border p-3.5 min-h-[112px] flex flex-col motion-safe:transition-colors ${FOCUS} ${on ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                              {on && <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-black grid place-items-center"><Check className="w-3 h-3" strokeWidth={3.5} /></span>}
                              {sz ? (
                                <p className="flex items-baseline gap-1 pr-6"><span className="text-[30px] leading-none font-black text-white tabular-nums">{sz.n}</span><span className="text-sm font-bold text-white/55">{sz.u}</span></p>
                              ) : (
                                <p className="text-[15px] leading-snug font-black text-white pr-6 line-clamp-2">{p.label ?? plainName(p.name)}</p>
                              )}
                              {v && <span className="mt-2 self-start rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">{v}</span>}
                              <p className="mt-auto pt-2 text-[16px] font-black text-primary tabular-nums">{naira(p.price)}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {tab === 'electricity' && (
                  <section className="space-y-4">
                    <div>
                      <Label>Electricity company</Label>
                      <Field icon={Zap}>
                        <select className={inputBase + ' pl-11 appearance-none'} value={disco} onChange={(e) => setDisco(e.target.value)}>
                          <option value="">Choose your company</option>
                          {catalog.electricity.discos.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                        </select>
                      </Field>
                    </div>
                    <div>
                      <Label>Meter type</Label>
                      <Seg value={meterType} onChange={setMeterType} options={[{ v: 'prepaid', label: 'Prepaid' }, { v: 'postpaid', label: 'Postpaid' }]} />
                    </div>
                    <div>
                      <Label>Meter number</Label>
                      <div className="relative">
                        <input className={inputBase + ' pl-4 pr-[104px] tabular-nums'} inputMode="numeric" placeholder="Meter number" value={meter} onChange={(e) => setMeter(e.target.value.replace(/\D/g, ''))} />
                        <button type="button" disabled={busy || !disco || meter.length < 8 || !!meterInfo} onClick={verify}
                          className={`absolute right-1.5 top-1.5 h-[40px] px-4 rounded-lg bg-primary text-black text-sm font-black disabled:opacity-35 ${FOCUS}`}>
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : meterInfo ? 'Verified' : 'Verify'}
                        </button>
                      </div>
                      {meterInfo && (
                        <div className="mt-2.5 flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
                          <BadgeCheck className="w-5 h-5 mt-0.5 shrink-0 text-emerald-300" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white break-words">{meterInfo.name}</p>
                            {meterInfo.address ? <p className="text-xs text-white/60 break-words">{meterInfo.address}</p> : null}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {QUICK_POWER.map((a) => <button key={a} type="button" className={pill(amount === a)} onClick={() => setAmount(a)}>{naira(a)}</button>)}
                      </div>
                      <Field icon={Zap}>
         <input aria-label="Other amount" className={inputBase + ' pl-11 tabular-nums'} type="number" inputMode="numeric" placeholder="Other amount" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} />
                      </Field>
                      <p className="text-xs text-white/45 mt-1.5">Between {naira(catalog.electricity.min)} and {naira(catalog.electricity.max)}.</p>
                    </div>
                    <div>
                      <Label>Phone number</Label>
                      <Field icon={Smartphone}>
                        <input className={inputBase + ' pl-11'} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 111 2222" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </Field>
                      <p className="text-xs text-white/45 mt-1.5">Your token details are sent to this number.</p>
                    </div>
                  </section>
                )}

                {tab === 'tv' && catalog.tv && (
                  <section className="space-y-4">
                    <div>
                      <Label>TV company</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {catalog.tv.operators.map((o) => {
                          const on = operator === o.code;
                          return (
                            <button key={o.code} type="button" aria-pressed={on} onClick={() => setOperator(o.code)}
                              className={`relative flex items-center gap-3 rounded-xl border px-3 min-h-[60px] motion-safe:transition-colors ${FOCUS} ${on ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                              <NetworkDot name={o.name} size={38} />
                              <span className={`text-[14px] font-bold ${on ? 'text-primary' : 'text-white/85'}`}>{o.name}</span>
                              {on && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-black grid place-items-center"><Check className="w-2.5 h-2.5" strokeWidth={3.5} /></span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label>Smartcard or IUC number</Label>
                      <div className="relative">
                        <input className={inputBase + ' pl-4 pr-[104px] tabular-nums'} inputMode="numeric" placeholder="Smartcard number" value={card} onChange={(e) => setCard(e.target.value.replace(/\D/g, ''))} />
                        <button type="button" disabled={busy || card.length < 8 || !!cardInfo} onClick={verifyCardNow}
                          className={`absolute right-1.5 top-1.5 h-[40px] px-4 rounded-lg bg-primary text-black text-sm font-black disabled:opacity-35 ${FOCUS}`}>
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : cardInfo ? 'Verified' : 'Verify'}
                        </button>
                      </div>
                      {cardInfo && (
                        <div className="mt-2.5 flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
                          <BadgeCheck className="w-5 h-5 mt-0.5 shrink-0 text-emerald-300" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white break-words">{cardInfo.name}</p>
                            <p className="text-xs text-white/60">{[cardInfo.status, cardInfo.dueDate ? `Due ${cardInfo.dueDate}` : ''].filter(Boolean).join(' · ') || 'Smartcard found'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Choose a bouquet</Label>
                      {bouquetsQ.isLoading && <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>}
                      {bouquetsQ.isError && <p className="text-sm text-red-300 rounded-xl border border-red-400/30 bg-red-500/10 p-3">We could not load the bouquets. Check your connection and try again in a moment.</p>}
                      <div className="space-y-2">
                        {bouquets.map((b) => {
                          const on = bouquetCode === b.code;
                          return (
                            <button key={b.code} type="button" aria-pressed={on} onClick={() => setBouquetCode(b.code)}
                              className={`w-full flex items-center gap-3 text-left rounded-xl border px-3.5 min-h-[56px] py-2 motion-safe:transition-colors ${FOCUS} ${on ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                              <span className={`grid place-items-center w-5 h-5 rounded-full border shrink-0 ${on ? 'bg-primary border-primary text-black' : 'border-white/30'}`}>{on && <Check className="w-3 h-3" strokeWidth={3.5} />}</span>
                              <span className="flex-1 min-w-0 text-[14px] font-semibold text-white leading-snug">{b.name}</span>
                              <span className="text-[15px] font-black text-primary tabular-nums">{naira(b.price)}</span>
                            </button>
                          );
                        })}
                      </div>
                      {catalog.tv.fee > 0 && bouquets.length > 0 && <p className="text-xs text-white/45 mt-2">Prices include a {naira(catalog.tv.fee)} service fee.</p>}
                    </div>
                    <div>
                      <Label>Phone number</Label>
                      <Field icon={Smartphone}>
                        <input className={inputBase + ' pl-11'} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 111 2222" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </Field>
                    </div>
                  </section>
                )}

                {tab === 'exam' && catalog.exam && (
                  <section className="space-y-4">
                    <div>
                      <Label>Exam</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {catalog.exam.types.map((t) => {
                          const on = exam === t.code;
                          return (
                            <button key={t.code} type="button" aria-pressed={on} onClick={() => setExam(t.code)}
                              className={`relative flex items-center gap-3 rounded-xl border px-3 min-h-[60px] motion-safe:transition-colors ${FOCUS} ${on ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                              <NetworkDot name={t.name} size={38} />
                              <span className={`text-[13.5px] leading-tight text-left font-bold ${on ? 'text-primary' : 'text-white/85'}`}>{t.name}</span>
                              {on && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-black grid place-items-center"><Check className="w-2.5 h-2.5" strokeWidth={3.5} /></span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label>Choose a product</Label>
                      {productsQ.isLoading && <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>}
                      {productsQ.isError && <p className="text-sm text-red-300 rounded-xl border border-red-400/30 bg-red-500/10 p-3">We could not load the products. Check your connection and try again in a moment.</p>}
                      <div className="space-y-2">
                        {products.map((p) => {
                          const on = productCode === p.code;
                          return (
                            <button key={p.code} type="button" aria-pressed={on} onClick={() => setProductCode(p.code)}
                              className={`w-full flex items-center gap-3 text-left rounded-xl border px-3.5 min-h-[56px] py-2 motion-safe:transition-colors ${FOCUS} ${on ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                              <span className={`grid place-items-center w-5 h-5 rounded-full border shrink-0 ${on ? 'bg-primary border-primary text-black' : 'border-white/30'}`}>{on && <Check className="w-3 h-3" strokeWidth={3.5} />}</span>
                              <span className="flex-1 min-w-0 text-[14px] font-semibold text-white leading-snug">{p.name}</span>
                              <span className="text-[15px] font-black text-primary tabular-nums">{naira(p.price)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label>How many pins</Label>
                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5">
                          <button type="button" aria-label="One less pin" disabled={qty <= 1} onClick={() => setQty((n) => Math.max(1, n - 1))} className={`w-12 h-12 grid place-items-center text-white disabled:opacity-30 rounded-xl ${FOCUS}`}><Minus className="w-4 h-4" /></button>
                          <span className="w-10 text-center text-[17px] font-black text-white tabular-nums" aria-live="polite">{qty}</span>
                          <button type="button" aria-label="One more pin" disabled={qty >= (catalog.exam.maxQuantity || 5)} onClick={() => setQty((n) => Math.min(catalog.exam!.maxQuantity || 5, n + 1))} className={`w-12 h-12 grid place-items-center text-white disabled:opacity-30 rounded-xl ${FOCUS}`}><Plus className="w-4 h-4" /></button>
                        </div>
                        <span className="text-xs text-white/45">Up to {catalog.exam.maxQuantity || 5} at a time</span>
                      </div>
                    </div>
                    <div>
                      <Label>Phone number</Label>
                      <Field icon={Smartphone}>
                        <input className={inputBase + ' pl-11'} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 111 2222" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </Field>
                    </div>
                    <p className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/10 p-3 text-xs text-white/75"><CreditCard className="w-4 h-4 mt-0.5 shrink-0 text-primary" />Your pin appears on the next page right after payment. Copy it and keep it safe.</p>
                  </section>
                )}

                <section>
                  <Label>Your email</Label>
                  <Field icon={Mail}>
                    <input className={inputBase + ' pl-11'} type="email" inputMode="email" autoComplete="email" placeholder="Where to send your receipt" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                </section>
              </div>

              {/* The receipt: what you are buying and what you pay */}
              <div className="relative rounded-3xl border border-white/10 px-5 pt-5 pb-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-start gap-3">
                  <ServiceBadge k={tab} size={40} solid />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-black text-white leading-tight">
                      {tab === 'airtime' ? `${network} airtime` : tab === 'data' ? (plan ? `${size ? `${size.n} ${size.u}` : plainName(plan.name)} ${network} data` : `${network} data`)
                        : tab === 'tv' ? (bouquet?.name ?? `${operatorName || 'TV'} subscription`)
                        : tab === 'exam' ? `${product?.name || examName || 'Exam pin'}${qty > 1 ? ` × ${qty}` : ''}`
                        : `${discoName || 'Electricity'} ${meterType}`}
                    </p>
                    <p className="text-xs text-white/55 mt-1 break-words">
                      {tab === 'electricity' ? (meter ? `Meter ${meter}` : 'Meter not entered yet')
                        : tab === 'tv' ? (card ? `Smartcard ${card}${cardInfo?.name ? ` · ${cardInfo.name}` : ''}` : 'Smartcard not entered yet')
                        : tab === 'exam' ? (examName || 'Exam pin')
                        : phone ? `To ${phone}` : 'Phone number not entered yet'}
                      {tab === 'data' && plan && validityOf(plan) ? ` · ${validityOf(plan)}` : ''}
                    </p>
                  </div>
                  <p className="text-[15px] font-bold text-white tabular-nums">{base ? naira(base) : '₦0'}</p>
                </div>
                {extraFee > 0 && base > 0 && (
                  <div className="flex justify-between text-[13px] text-white/60 mt-3"><span>Service fee</span><span className="tabular-nums">{naira(extraFee)}</span></div>
                )}
                {/* tear line */}
                <div className="relative my-4">
                  <div className="border-t border-dashed border-white/20" />
                  <span aria-hidden className="absolute -left-[30px] -top-[10px] w-5 h-5 rounded-full bg-background border border-white/10" />
                  <span aria-hidden className="absolute -right-[30px] -top-[10px] w-5 h-5 rounded-full bg-background border border-white/10" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm font-bold text-white/70">You pay</span>
                  <span className="text-[34px] leading-none font-black text-primary tabular-nums">{total ? naira(total) : '₦0'}</span>
                </div>
              </div>

              {err && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{err}</span>
                </div>
              )}

              <div>
                <button type="button" onClick={() => { setErr(''); setSheet(true); }} disabled={busy || !!missing}
                  className={`w-full h-14 rounded-2xl bg-primary text-black font-black text-[17px] inline-flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-transform active:scale-[0.99] ${FOCUS}`}>
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-[18px] h-[18px]" strokeWidth={2.6} />}
                  {total && !missing ? `Pay ${naira(total)}` : 'Pay now'}
                </button>
                <p className="text-center text-[13px] mt-2 min-h-[20px]" style={{ color: missing ? look.tint : 'rgba(255,255,255,0.45)' }}>
                  {missing || 'Next, choose to pay direct or from your wallet.'}
                </p>
              </div>

              <ul className="grid grid-cols-3 gap-2 pt-1">
                {([[ShieldCheck, 'Secure payment'], [RotateCcw, 'Refunded if it fails'], [Timer, 'Usually done in a minute']] as Array<[LucideIcon, string]>).map(([Icon, text]) => (
                  <li key={text} className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-white/10 px-2 py-3" style={surface}>
                    <Icon className="w-[18px] h-[18px] text-white/60" />
                    <span className="text-[11.5px] leading-snug text-white/60">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
      <PaySheet open={sheet} onClose={() => setSheet(false)} total={total || 0} busy={busy} signedIn={signedIn}
        balance={walletQ.data ? walletQ.data.balance : null} balanceLoading={walletQ.isLoading}
        onCard={() => pay('card')} onWallet={() => pay('wallet')} onLeave={leaveForWallet} />
      <Footer />
    </div>
  );
}
