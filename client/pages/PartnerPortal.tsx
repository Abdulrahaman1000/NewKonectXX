/**
 * Partner portal: login + dashboard on one page.  Destination: client/pages/PartnerPortal.tsx
 * Route: /partner
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, Eye, Play, Search, X, EyeOff, LogOut, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDialogs } from '@/components/shared/ConfirmProvider';
import {
  clearPartnerToken,
  getPartnerAds,
  getPartnerDashboard,
  requestWithdrawal,
  type PartnerAd,
  getPartnerToken,
  partnerLogin,
  type CommissionState,
} from '@/api/partner';

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;
const day = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

const CHIP: Record<CommissionState, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  paid: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/25',
};
const LABEL: Record<CommissionState, string> = { pending: 'Pending', approved: 'Approved', paid: 'Paid', cancelled: 'Cancelled' };

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await partnerLogin(email, password);
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none focus:border-primary';
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Partner login</h1>
      <p className="mt-1 text-sm text-muted-foreground">Smart Combo Partner Program</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input className={input} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="relative">
          <input className={`${input} pr-12`} type={show ? 'text' : 'password'} placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Not a partner yet? <a href="/" className="underline">Apply on the home page</a>
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Overview({ onLogout }: { onLogout: () => void }) {
  const q = useQuery({ queryKey: ['partner-dashboard'], queryFn: getPartnerDashboard, retry: false });
  const qc = useQueryClient();
  const { confirm } = useDialogs();
  const withdraw = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: (r) => {
      toast.success(`Withdrawal of ${naira(r.amount)} requested`);
      qc.invalidateQueries({ queryKey: ['partner-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not request the withdrawal'),
  });

  if (q.isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  if (q.isError || !q.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-red-300">{(q.error as Error)?.message ?? 'Could not load your dashboard.'}</p>
        <button className="btn-primary" onClick={onLogout}>Back to login</button>
      </div>
    );
  }

  const d = q.data;
  const link = `${d.siteUrl ?? window.location.origin}${d.linkPath}`;
  const canWithdraw = d.withdrawable >= d.minWithdrawal;
  const hasOpenRequest = d.withdrawals.some((w) => w.status === 'requested');
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success('Link copied'); } catch { toast.error('Could not copy. Press and hold the link to copy.'); }
  };
  const share = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out Smart Combo gadget deals: ${link}`)}`, '_blank');

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-xl font-bold">{d.partner.fullName}</h1>
          <p className="text-xs text-muted-foreground">Partner code {d.partner.code}</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold">Your personal link</p>
        <p className="mt-2 break-all rounded-lg bg-black/30 px-3 py-2 text-sm">{link}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={copy} className="btn-primary flex flex-1 items-center justify-center gap-2"><Copy className="h-4 w-4" /> Copy link</button>
          <button onClick={share} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
        <p className="text-sm text-emerald-300">Available to withdraw</p>
        <p className="mt-1 text-3xl font-bold">{naira(d.withdrawable)}</p>
        {d.requested > 0 && (
          <p className="mt-1 text-xs text-amber-300">{naira(d.requested)} already requested and waiting to be paid.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {canWithdraw
            ? `Ready. Request it and we will pay ${d.partner.bankName} ${d.partner.accountNumber}.`
            : d.cycle && new Date(d.cycle.releaseAt) > new Date()
              ? `Your payout week started ${day(d.cycle.startedAt)}. Everything delivered by ${day(d.cycle.releaseAt)} becomes withdrawable together on that day.`
              : d.cycle
                ? `Minimum withdrawal is ${naira(d.minWithdrawal)}.`
                : 'Your payout week starts when your first referred order is delivered.'}
        </p>
        <button
          disabled={!canWithdraw || hasOpenRequest || withdraw.isPending}
          onClick={async () => {
            const ok = await confirm({
              title: 'Request withdrawal?',
              message: `${naira(d.withdrawable)} will be paid to ${d.partner.bankName} ${d.partner.accountNumber}.`,
              confirmText: 'Request withdrawal',
            });
            if (ok) withdraw.mutate();
          }}
          className="btn-primary mt-3 w-full disabled:opacity-50"
        >
          {withdraw.isPending ? 'Requesting…' : hasOpenRequest ? 'Withdrawal pending' : 'Request withdrawal'}
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Clicks" value={String(d.stats.clicks)} sub={`${d.stats.clicks30} in the last 30 days`} />
        <Stat label="Orders" value={String(d.stats.orders)} />
        <Stat label="Conversion" value={`${d.stats.conversion}%`} sub="orders per click" />
        <Stat label="Pending" value={naira(d.totals.pending)} sub="delivered orders open on payout day" />
        <Stat label="Approved" value={naira(d.totals.approved)} />
        <Stat label="Paid" value={naira(d.totals.paid)} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Recent orders</h2>
        {d.recent.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">No orders yet. Share your link to get started.</p>
        ) : (
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
            {d.recent.map((r) => (
              <div key={r.orderNumber} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">{r.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {day(r.date)}{r.availableOn ? ` · available ${day(r.availableOn)}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{naira(r.amount)}</p>
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${CHIP[r.status]}`}>{LABEL[r.status]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Withdrawals &amp; payout history</h2>
        {d.withdrawals.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
            {d.withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">{day(w.paidAt ?? w.date)} · {w.orders} order{w.orders === 1 ? '' : 's'}</p>
                  {w.note && <p className="text-xs text-muted-foreground">{w.note}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{naira(w.amount)}</p>
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${w.status === 'paid' ? CHIP.paid : w.status === 'rejected' ? CHIP.cancelled : CHIP.pending}`}>
                    {w.status === 'paid' ? 'Paid' : w.status === 'rejected' ? 'Declined' : 'Requested'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Cloudinary links get a "download" flag so the browser saves instead of opening the file. */
const downloadUrl = (url: string) => (url.includes('res.cloudinary.com') ? url.replace('/upload/', '/upload/fl_attachment/') : url);

function CaptionBox({ name, text, link }: { name: string; text: string; link: string }) {
  if (!text) return null;
  const final = text.split('{{LINK}}').join(link);
  const copy = async () => {
    try { await navigator.clipboard.writeText(final); toast.success(`${name} caption copied`); } catch { toast.error('Could not copy'); }
  };
  return (
    <div className="rounded-lg bg-black/30 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold">{name}</span>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-primary"><Copy className="h-3.5 w-3.5" /> Copy</button>
      </div>
      <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{final}</p>
    </div>
  );
}

/** Small square preview. Cloudinary files are resized on the fly so 30 thumbnails load fast. */
function thumbUrl(ad: PartnerAd): string {
  if (!ad.url.includes('res.cloudinary.com')) return ad.url;
  const t = 'w_320,h_320,c_fill,q_auto';
  if (ad.kind === 'video') {
    return ad.url.replace('/video/upload/', `/video/upload/so_0,${t},f_jpg/`).replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg');
  }
  return ad.url.replace('/upload/', `/upload/${t},f_auto/`);
}

function Tile({ ad, onOpen }: { ad: PartnerAd; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left">
      <div className="relative aspect-square w-full bg-black/40">
        {ad.kind === 'text' ? (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">Caption only</div>
        ) : (
          <img src={thumbUrl(ad)} alt={ad.title} loading="lazy" className="h-full w-full object-cover" />
        )}
        {ad.kind === 'video' && (
          <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
            <Play className="h-3 w-3" /> Video
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{ad.title}</p>
        {ad.product && <p className="truncate text-[10px] text-muted-foreground">{ad.product}</p>}
      </div>
    </button>
  );
}

function AdModal({ ad, link, onClose }: { ad: PartnerAd; link: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-background sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate font-semibold">{ad.title}</p>
            {ad.product && <p className="truncate text-xs text-muted-foreground">{ad.product}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-white/10 p-2"><X className="h-4 w-4" /></button>
        </div>
        {ad.kind === 'image' && <img src={ad.url} alt={ad.title} className="max-h-[50vh] w-full bg-black object-contain" />}
        {ad.kind === 'video' && <video src={ad.url} controls playsInline preload="metadata" className="max-h-[50vh] w-full bg-black" />}
        <div className="space-y-3 p-4">
          {ad.url && ad.kind !== 'text' && (
            <a href={downloadUrl(ad.url)} download target="_blank" rel="noreferrer" className="btn-primary flex items-center justify-center gap-2">
              <Download className="h-4 w-4" /> Download {ad.kind}
            </a>
          )}
          <CaptionBox name="WhatsApp" text={ad.whatsappCaption} link={link} />
          <CaptionBox name="Instagram" text={ad.instagramCaption} link={link} />
          <CaptionBox name="TikTok" text={ad.tiktokCaption} link={link} />
        </div>
      </div>
    </div>
  );
}

const PAGE = 24;

function Ads() {
  const dash = useQuery({ queryKey: ['partner-dashboard'], queryFn: getPartnerDashboard, retry: false });
  const ads = useQuery({ queryKey: ['partner-ads'], queryFn: getPartnerAds, retry: false });
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'image' | 'video'>('all');
  const [product, setProduct] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<PartnerAd | null>(null);
  const link = dash.data ? `${dash.data.siteUrl ?? window.location.origin}${dash.data.linkPath}` : '';

  const products = useMemo(
    () => [...new Set((ads.data ?? []).map((a) => a.product).filter(Boolean))].sort(),
    [ads.data],
  );
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (ads.data ?? []).filter(
      (a) =>
        (type === 'all' || a.kind === type) &&
        (!product || a.product === product) &&
        (!q || `${a.title} ${a.product}`.toLowerCase().includes(q)),
    );
  }, [ads.data, search, type, product]);

  if (ads.isLoading || dash.isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>;
  if (ads.isError) return <p className="py-10 text-center text-sm text-red-300">{(ads.error as Error).message}</p>;
  if (!ads.data?.length) {
    return <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">No ads yet. New images, videos and captions will appear here.</p>;
  }

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 text-muted-foreground'}`;
  const reset = () => setShown(PAGE);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Tap an ad to download it and copy the caption. Your personal link is already inside each caption.</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); reset(); }}
          placeholder="Search ads"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(['all', 'image', 'video'] as const).map((t) => (
          <button key={t} onClick={() => { setType(t); reset(); }} className={chip(type === t)}>
            {t === 'all' ? 'All' : t === 'image' ? 'Images' : 'Videos'}
          </button>
        ))}
        {products.length > 0 && <span className="shrink-0 self-center text-white/20">|</span>}
        {products.map((p) => (
          <button key={p} onClick={() => { setProduct(product === p ? '' : p); reset(); }} className={chip(product === p)}>{p}</button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{list.length} ad{list.length === 1 ? '' : 's'}</p>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">Nothing matches. Try a different filter.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.slice(0, shown).map((a) => <Tile key={a.id} ad={a} onOpen={() => setOpen(a)} />)}
        </div>
      )}

      {list.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE)} className="w-full rounded-xl border border-white/10 py-2.5 text-sm">
          Show more ({list.length - shown} left)
        </button>
      )}

      {open && <AdModal ad={open} link={link} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'overview' | 'ads'>('overview');
  const btn = (k: 'overview' | 'ads', text: string) => (
    <button
      onClick={() => setTab(k)}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
    >
      {text}
    </button>
  );
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2 px-4 py-2">{btn('overview', 'Overview')}{btn('ads', 'Ads')}</div>
      </div>
      {tab === 'overview' ? (
        <Overview onLogout={onLogout} />
      ) : (
        <div className="mx-auto max-w-4xl px-4 py-6"><Ads /></div>
      )}
    </div>
  );
}

export default function PartnerPortal() {
  const qc = useQueryClient();
  const [loggedIn, setLoggedIn] = useState(() => !!getPartnerToken());
  const logout = () => {
    clearPartnerToken();
    qc.removeQueries({ queryKey: ['partner-dashboard'] });
    setLoggedIn(false);
  };
  return loggedIn ? <Shell onLogout={logout} /> : <Login onDone={() => setLoggedIn(true)} />;
}
