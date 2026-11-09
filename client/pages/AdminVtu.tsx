/** SC-VTU  Admin > VTU (owner only): recharge sales and profit, purchases that need attention, refunds, prices. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { adminDismissAlert, adminPlans, adminProviders, adminResetPlan, adminSetPlan, adminSetProvider, adminVtuAct, adminVtuList, adminVtuSaveSettings, adminVtuSettings, getCatalog, type AdminPlan, type AdminVtuOrder, type VtuSettings } from '@/api/vtu';

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
const FILTERS: Array<[string, string]> = [['attention', 'Needs attention'], ['all', 'All'], ['successful', 'Delivered'], ['refunds', 'Refunds'], ['unpaid', 'Not paid']];
const REFUND_TEXT: Record<string, string> = { not_required: '', required: 'Refund needed', refund_requested: 'Refund sent to Paystack', refunded: 'Refunded', failed: 'Refund failed: do it by hand' };
const inp = 'w-full min-h-[40px] rounded-lg bg-white/5 border border-white/15 px-3 text-sm text-white';

function Row({ o, onAct, busy }: { o: AdminVtuOrder; onAct: (a: any) => void; busy: boolean }) {
  const needsRefund = o.refundStatus === 'required' || o.refundStatus === 'failed';
  const btn = 'min-h-[40px] px-3 rounded-lg border border-white/20 text-xs font-bold text-white/85 disabled:opacity-50';
  return (
    <li className="rounded-2xl border border-white/10 p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex justify-between gap-2">
        <span className="text-sm font-black text-white">{o.service} · {o.network} {o.service === 'electricity' ? '' : o.planName}</span>
        <span className="text-sm font-black text-primary">{naira(o.amount)}</span>
      </div>
      <p className="text-xs text-white/60">{o.phone || ''}{o.meter ? ` meter ${o.meter.number}` : ''} · {o.email} · {new Date(o.createdAt).toLocaleString('en-NG')}</p>
      <p className="text-xs text-white/70">
        Payment: <b>{o.paymentStatus}</b> · Delivery: <b>{o.fulfilmentStatus}</b>{o.refundStatus !== 'not_required' ? <> · <span className="text-amber-300 font-bold">{REFUND_TEXT[o.refundStatus]}</span></> : null}
        {' '}· cost {naira(o.cost)} · profit {naira(o.amount - o.cost)}
      </p>
      {(o.providerMessage || o.refundNote) && <p className="text-[11px] text-white/45">{o.providerMessage} {o.refundNote}</p>}
      {o.providerCode && ({ '016': 'VTpass code 016 = transaction failed. On the sandbox this usually means the phone/meter is not a VTpass test number. On live, check the number and that the product is switched on in VTpass.', '018': 'VTpass code 018 = your VTpass wallet is low. Fund it.', '027': 'VTpass code 027 = this server IP is not whitelisted in VTpass.', '028': 'VTpass code 028 = this product is not whitelisted in VTpass.' } as Record<string, string>)[o.providerCode] && <p className="text-[11px] text-amber-300/90">{({ '016': 'VTpass code 016 = transaction failed. On the sandbox this usually means the phone/meter is not a VTpass test number. On live, check the number and that the product is switched on in VTpass.', '018': 'VTpass code 018 = your VTpass wallet is low. Fund it.', '027': 'VTpass code 027 = this server IP is not whitelisted in VTpass.', '028': 'VTpass code 028 = this product is not whitelisted in VTpass.' } as Record<string, string>)[o.providerCode]}</p>} {/* SC-SRCH */}
      <p className="text-[10px] text-white/35 break-all">{o.reference}{o.provider ? ` · via ${o.provider}` : ''}{o.providerCode ? ` · code ${o.providerCode}` : ''}{o.providerReference ? ` · provider ref ${o.providerReference}` : ''}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {/* SC-RETRY */}
        {o.paymentStatus === 'paid' && o.fulfilmentStatus === 'pending' && <button className={btn} disabled={busy} onClick={() => onAct({ r: o.reference, a: 'check' })}>Send now</button>}
        {(o.paymentStatus === 'pending' || o.fulfilmentStatus === 'processing') && <button className={btn} disabled={busy} onClick={() => onAct({ r: o.reference, a: 'check' })}>Check status</button>}
        {o.paymentStatus === 'paid' && o.fulfilmentStatus === 'processing' && <button className={btn} disabled={busy} onClick={() => window.confirm('Only do this if the provider confirms it was NOT delivered. The customer will be refunded.') && onAct({ r: o.reference, a: 'mark-failed' })}>Mark failed and refund</button>}
        {o.paymentStatus === 'paid' && o.fulfilmentStatus === 'processing' && <button className={btn} disabled={busy} onClick={() => window.confirm('Only do this if the provider dashboard shows this purchase was DELIVERED.') && onAct({ r: o.reference, a: 'mark-delivered' })}>Mark delivered</button>}
        {needsRefund && <button className={btn} disabled={busy} onClick={() => onAct({ r: o.reference, a: 'refund' })}>Retry refund</button>}
        {(needsRefund || o.refundStatus === 'refund_requested') && <button className={btn} disabled={busy} onClick={() => window.confirm('Press OK only if you already refunded this customer.') && onAct({ r: o.reference, a: 'mark-refunded' })}>Mark refunded</button>}
      </div>
    </li>
  );
}


const NETS = ['MTN', 'Airtel', 'Glo', '9mobile'];

/** SC-VTU3  Plans and prices: set your own price, hide, rename, and switch networks and electricity companies on or off. */
function PlansPanel({ settings, onSettings }: { settings: VtuSettings; onSettings: (patch: Partial<VtuSettings>) => void }) {
  const qc = useQueryClient();
  const [net, setNet] = useState('MTN');
  const q = useQuery({ queryKey: ['vtu-plans-admin', net], queryFn: () => adminPlans(net), retry: false });
  const cat = useQuery({ queryKey: ['vtu-catalog-admin'], queryFn: getCatalog, retry: false });
  const [draft, setDraft] = useState<Record<string, { price?: string; label?: string }>>({});
  const refresh = () => { qc.invalidateQueries({ queryKey: ['vtu-plans-admin'] }); qc.invalidateQueries({ queryKey: ['vtu-catalog'] }); };
  const setM = useMutation({
    mutationFn: (x: { code: string; patch: { customPrice?: number | null; hidden?: boolean; label?: string } }) => adminSetPlan(x.code, { ...x.patch, network: net }),
    onSuccess: () => { toast.success('Saved'); refresh(); }, onError: (e: any) => toast.error(e?.message || 'Could not save'),
  });
  const resetM = useMutation({ mutationFn: (c: string) => adminResetPlan(c), onSuccess: () => { toast.success('Back to the rule'); refresh(); } });
  const toggle = (k: 'disabledNetworks' | 'disabledDiscos', v: string) => {
    const cur = settings[k] ?? []; onSettings({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as any);
  };
  const inp2 = 'w-24 min-h-[40px] rounded-lg bg-white/5 border border-white/15 px-2 text-sm text-white';
  const groups = ['daily', 'weekly', 'monthly'];
  return (
    <section className="rounded-2xl border border-white/10 p-4 space-y-4 mb-8" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <h2 className="text-sm font-black text-white">Plans and prices</h2>
      <div>
        <p className="text-xs text-white/55 mb-2">Networks you sell (untick to stop selling one, press Save under Prices and limits)</p>
        <div className="flex flex-wrap gap-3">
          {NETS.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm text-white/85 min-h-[40px]">
              <input type="checkbox" className="w-5 h-5 accent-yellow-400" checked={!(settings.disabledNetworks ?? []).includes(n)} onChange={() => toggle('disabledNetworks', n)} /> {n}
            </label>
          ))}
        </div>
      </div>
      {(cat.data?.electricity.discos.length ?? 0) > 0 && (
        <div>
          <p className="text-xs text-white/55 mb-2">Electricity companies you sell</p>
          <div className="flex flex-wrap gap-3">
            {cat.data!.electricity.discos.concat((settings.disabledDiscos ?? []).filter((d) => !cat.data!.electricity.discos.some((x) => x.code === d)).map((c) => ({ code: c, name: c }))).map((d) => (
              <label key={d.code} className="flex items-center gap-2 text-sm text-white/85 min-h-[40px]">
                <input type="checkbox" className="w-5 h-5 accent-yellow-400" checked={!(settings.disabledDiscos ?? []).includes(d.code)} onChange={() => toggle('disabledDiscos', d.code)} /> {d.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {NETS.map((n) => <button key={n} onClick={() => setNet(n)} className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold ${net === n ? 'border-primary bg-primary/15 text-primary' : 'border-white/15 text-white/70'}`}>{n}</button>)}
      </div>
      {q.isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
      {q.isError && <p className="text-sm text-red-400">Could not load plans. Pick a ready provider above, and check its keys in the server settings.</p>}
      {q.data && q.data.plans.length === 0 && <p className="text-sm text-white/55">The provider returned no plans.</p>}
      {groups.map((g) => {
        const rows = (q.data?.plans ?? []).filter((p) => p.category === g);
        if (!rows.length) return null;
        return (
          <div key={g}>
            <p className="text-xs font-black uppercase tracking-wider text-primary/80 mb-2">{g}</p>
            <ul className="space-y-2">
              {rows.map((p: AdminPlan) => {
                const d = draft[p.code] ?? {};
                const priceVal = d.price ?? (p.customPrice != null ? String(p.customPrice) : '');
                return (
                  <li key={p.code} className={`rounded-xl border p-3 ${p.hidden ? 'border-white/10 opacity-60' : 'border-white/15'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{p.label || p.name}{p.label ? <span className="text-white/40 font-normal"> ({p.name})</span> : null}</p>
                        <p className="text-[11px] text-white/50">{p.missing ? 'The provider no longer has this plan' : `Cost ${naira(p.cost)} · rule price ${naira(p.rulePrice)}`}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{naira(p.price)}</p>
                        <p className={`text-[11px] ${p.belowCost ? 'text-red-400 font-bold' : 'text-white/50'}`}>{p.belowCost ? `Loss ${naira(-p.profit)}` : `Profit ${naira(p.profit)}`}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input className={inp2} type="number" inputMode="numeric" placeholder="My price" value={priceVal} onChange={(e) => setDraft({ ...draft, [p.code]: { ...d, price: e.target.value } })} />
                      <input className={inp2 + ' !w-36'} placeholder="Label (optional)" value={d.label ?? p.label} onChange={(e) => setDraft({ ...draft, [p.code]: { ...d, label: e.target.value } })} />
                      <button disabled={setM.isPending} className="min-h-[40px] px-3 rounded-lg bg-primary text-black text-xs font-black" onClick={() => setM.mutate({ code: p.code, patch: { customPrice: priceVal === '' ? null : Number(priceVal), label: d.label ?? p.label } })}>Save</button>
                      <button disabled={setM.isPending} className="min-h-[40px] px-3 rounded-lg border border-white/20 text-xs font-bold text-white/85" onClick={() => setM.mutate({ code: p.code, patch: { hidden: !p.hidden } })}>{p.hidden ? 'Show' : 'Hide'}</button>
                      {(p.customPrice != null || p.label || p.hidden) && <button className="min-h-[40px] px-3 text-xs text-white/55 underline" onClick={() => { setDraft({ ...draft, [p.code]: {} }); resetM.mutate(p.code); }}>Reset</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="text-[11px] text-white/45">Leave "My price" empty to use the percentage rule. The server charges the price shown here, never a price sent by the browser.</p>
    </section>
  );
}


/** SC-PROV  Which provider handles NEW purchases. Switching never touches purchases already made. */
function ProviderPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['vtu-providers'], queryFn: adminProviders, retry: false });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['vtu-providers'] }); qc.invalidateQueries({ queryKey: ['vtu-plans-admin'] }); qc.invalidateQueries({ queryKey: ['vtu-catalog'] }); qc.invalidateQueries({ queryKey: ['vtu-catalog-admin'] }); };
  const pick = useMutation({ mutationFn: (n: string) => adminSetProvider(n), onSuccess: () => { toast.success('Switched. New purchases use it now.'); refresh(); }, onError: (e: any) => toast.error(e?.message || 'Could not switch') });
  const dismiss = useMutation({ mutationFn: adminDismissAlert, onSuccess: refresh });
  const d = q.data;
  return (
    <section className="rounded-2xl border border-white/10 p-4 space-y-3 mb-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <h2 className="text-sm font-black text-white">Provider (who we buy airtime, data and electricity from)</h2>
      {d?.alert && (
        <div className="rounded-xl border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-200">
          <p className="font-bold">Fix this before selling more</p>
          <p className="text-xs mt-1">{d.alert.message}</p>
          <button className="mt-2 min-h-[40px] px-3 rounded-lg border border-white/25 text-xs font-bold text-white/85" onClick={() => dismiss.mutate()}>I fixed it, hide this</button>
        </div>
      )}
      {q.isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
      {d && !d.active && <p className="text-sm text-amber-300">No provider is in use, so recharge is switched off on the site. Pick one that is ready.</p>}
      <ul className="space-y-2">
        {d?.providers.map((p) => {
          const on = d.active === p.name;
          return (
            <li key={p.name} className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2 ${on ? 'border-primary bg-primary/10' : 'border-white/15'}`}>
              <div>
                <p className="text-sm font-bold text-white">{p.label} {on && <span className="text-primary text-xs">· in use</span>}</p>
                <p className="text-[11px] text-white/50">{p.ready ? (p.testMode ? 'Ready, TEST mode: nothing real is delivered' : 'Ready') : `Not ready. ${p.hint}`}</p>
              </div>
              {!on && <button disabled={!p.ready || pick.isPending} className="min-h-[40px] px-3 rounded-lg bg-primary text-black text-xs font-black disabled:opacity-40" onClick={() => window.confirm(`Use ${p.label} for new purchases? Purchases already made stay with their own provider.`) && pick.mutate(p.name)}>Use this</button>}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-white/45">Each provider has its own plan prices below. After switching, check Plans and prices once. Plans of the old provider are kept for when you switch back.</p>
    </section>
  );
}

export default function AdminVtu() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('attention');
  const [qText, setQText] = useState(''); // SC-SRCH
  const [search, setSearch] = useState('');
  const list = useQuery({ queryKey: ['vtu-admin', filter, search], queryFn: () => adminVtuList(filter, search), refetchInterval: 20000 });
  const settingsQ = useQuery({ queryKey: ['vtu-settings'], queryFn: adminVtuSettings });
  const [s, setS] = useState<VtuSettings | null>(null);
  useEffect(() => { if (settingsQ.data) setS(settingsQ.data); }, [settingsQ.data]);

  const act = useMutation({
    mutationFn: (x: { r: string; a: 'check' | 'refund' | 'mark-refunded' | 'mark-failed' | 'mark-delivered' }) => adminVtuAct(x.r, x.a),
    onSuccess: () => { toast.success('Done'); qc.invalidateQueries({ queryKey: ['vtu-admin'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });
  const save = useMutation({
    mutationFn: (v: Partial<VtuSettings>) => adminVtuSaveSettings(v),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['vtu-settings'] }); },
    onError: (e: any) => toast.error(e?.message || 'Could not save'),
  });
  const sum = list.data?.summary;
  const num = (k: keyof VtuSettings) => (
    <input className={inp} type="number" value={s ? (s[k] as number) : ''} onChange={(e) => s && setS({ ...s, [k]: Number(e.target.value) })} />
  );

  return (
    <AdminFrame>
      <SEO title="VTU | Admin" description="Recharge sales" />
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4"><ArrowLeft className="w-3 h-3" /> Dashboard</Link>
      <h1 className="text-2xl font-black text-white mb-4">Airtime, data and electricity</h1>

      <ProviderPanel />

      {sum && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
          {[['Sales', naira(sum.sales)], ['Profit', naira(sum.profit)], ['Delivered', String(sum.count)], ['Needs attention', String(sum.processing + sum.refundsNeeded + sum.mismatches)]].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[11px] text-white/50">{k}</p><p className="text-lg font-black text-white">{v}</p>
            </div>
          ))}
        </div>
      )}
      {sum && sum.mismatches > 0 && <p className="mb-3 text-sm text-amber-300">{sum.mismatches} payment(s) did not match the amount. Check them in Paystack before doing anything.</p>}

      {/* SC-SRCH */}
      <form className="mb-3" onSubmit={(e) => { e.preventDefault(); setSearch(qText.trim()); }}>
        <div className="flex gap-2">
          <input value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Search: reference (SC-VTU-...), phone, email, meter, smartcard, token" aria-label="Search purchases" className="flex-1 min-h-[44px] rounded-xl bg-white/5 border border-white/15 px-3 text-sm text-white placeholder-white/35" />
          <button type="submit" className="min-h-[44px] px-4 rounded-xl bg-primary text-black text-sm font-black">Search</button>
          {search && <button type="button" onClick={() => { setQText(''); setSearch(''); }} className="min-h-[44px] px-3 rounded-xl border border-white/20 text-sm font-bold text-white/80">Clear</button>}
        </div>
        <p className="text-[11px] text-white/45 mt-1.5">{search ? `Showing purchases matching "${search}" (all dates, filters ignored). At least 3 characters.` : 'Ask the customer for: the reference on their receipt page, or the phone/meter/smartcard, their email, the amount and the time.'}</p>
      </form>
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold ${filter === k ? 'border-primary bg-primary/15 text-primary' : 'border-white/15 text-white/70'}`}>{label}</button>
        ))}
      </div>
      {list.isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
      {list.data && list.data.orders.length === 0 && <p className="text-sm text-white/55">Nothing here.</p>}
      <ul className="space-y-2 mb-8">
        {list.data?.orders.map((o) => <Row key={o.reference} o={o} busy={act.isPending} onAct={(x) => act.mutate(x)} />)}
      </ul>

      {s && <PlansPanel settings={s} onSettings={(patch) => setS({ ...s, ...patch })} />}

      {s && (
        <section className="rounded-2xl border border-white/10 p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h2 className="text-sm font-black text-white">Prices and limits</h2>
          <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
            <label>Airtime discount from provider (%)<br />{num('airtimeDiscountPct')}</label>
            <label>Added to data price (%)<br />{num('dataMarginPct')}</label>
            <label>Electricity fee (₦)<br />{num('electricityFee')}</label>
            <label>TV fee (₦) {/* SC-TV */}<br />{num('tvFee')}</label>
            <label>Exam pin fee (₦)<br />{num('examFee')}</label>
            <span />
            <label>Airtime min (₦)<br />{num('airtimeMin')}</label>
            <label>Airtime max (₦)<br />{num('airtimeMax')}</label>
            <label>Electricity min (₦)<br />{num('electricityMin')}</label>
            <label>Electricity max (₦)<br />{num('electricityMax')}</label>
          </div>
          <p className="text-[11px] text-white/45">Airtime is sold at face value; your profit is the provider's discount. Data is the provider's price plus the percentage above. Check these against your provider's real prices before going live.</p>
          <label className="flex items-center gap-2 text-sm text-white/80 min-h-[44px]"><input type="checkbox" checked={s.paused} onChange={(e) => setS({ ...s, paused: e.target.checked })} className="w-5 h-5 accent-yellow-400" /> Pause all recharge sales</label>
          <button disabled={save.isPending} onClick={() => save.mutate(s)} className="min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-sm disabled:opacity-60">Save</button>
        </section>
      )}
    </AdminFrame>
  );
}
