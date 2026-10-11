/**
 * Admin Resellers — /admin/Resellers
 *
 * Review Reseller applications: approve (assigns the Reseller code), reject a pending
 * application, suspend or reinstate an approved Reseller, and message them on WhatsApp.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Ban,
  Check,
  Loader2,
  MessageCircle,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import {
  AdminReseller,
  ResellerStatus,
  deleteReseller,
  getResellerCounts,
  listResellersAdmin,
  setResellerStatus,
} from '@/api/adminResellers';
import { toast } from 'sonner';

const TABS: { key: ResellerStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'suspended', label: 'Suspended' },
];

const EMPTY_TEXT: Record<ResellerStatus, string> = {
  pending: 'No applications waiting for review.',
  approved: 'No approved Resellers yet.',
  suspended: 'No suspended Resellers.',
};

const STATUS_CHIP: Record<ResellerStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  suspended: 'bg-red-500/15 text-red-300 border-red-500/25',
};

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** wa.me wants digits only with the country code. A leading 0 is treated as Nigeria (234). */
function waLink(rawNumber: string, message: string) {
  const digits = rawNumber.replace(/\D/g, '');
  const international = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminResellers() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ResellerStatus>('pending');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());

  const { data: counts } = useQuery({
    queryKey: ['admin-Reseller-counts'],
    queryFn: getResellerCounts,
  });

  const { data: Resellers = [], isLoading } = useQuery({
    queryKey: ['admin-Resellers', status, q],
    queryFn: () => listResellersAdmin({ status, q }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-Resellers'] });
    queryClient.invalidateQueries({ queryKey: ['admin-Reseller-counts'] });
  };

  const statusMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'approved' | 'suspended' }) =>
      setResellerStatus(id, next),
    onSuccess: (Reseller, { next }) => {
      toast.success(
        next === 'approved'
          ? `Approved${Reseller.ResellerCode ? `. Code ${Reseller.ResellerCode}` : ''}`
          : 'Reseller suspended',
      );
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'Could not update Reseller'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteReseller,
    onSuccess: () => {
      toast.success('Application rejected');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'Could not reject application'),
  });

  const busyId = statusMut.isPending
    ? statusMut.variables?.id
    : deleteMut.isPending
      ? deleteMut.variables
      : null;

  const handleReject = (r: AdminReseller) => {
    if (confirm(`Reject and delete the application from ${r.fullName}?\n\nThis cannot be undone.`)) {
      deleteMut.mutate(r.id);
    }
  };

  const handleSuspend = (r: AdminReseller) => {
    if (confirm(`Suspend ${r.fullName}${r.ResellerCode ? ` (${r.ResellerCode})` : ''}?`)) {
      statusMut.mutate({ id: r.id, next: 'suspended' });
    }
  };

  return (
    <AdminFrame>
      <SEO title="Resellers — Admin" />

      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white">Resellers</h1>
        <p className="text-white/50 text-sm mt-1">
          Review applications and manage who can sell for Smart Combo.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Reseller status">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              onClick={() => setStatus(tab.key)}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                status === tab.key
                  ? 'bg-primary text-black'
                  : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${status === tab.key ? 'text-black/60' : 'text-white/35'}`}>
                {counts?.[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, code"
            aria-label="Search Resellers"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : Resellers.length === 0 ? (
        <p className="text-center py-16 text-white/40">
          {q ? `Nothing matches "${q}" in ${status}.` : EMPTY_TEXT[status]}
        </p>
      ) : (
        <div className="space-y-2">
          {Resellers.map((r) => (
            <ResellerCard
              key={r.id}
              Reseller={r}
              busy={busyId === r.id}
              onApprove={() => statusMut.mutate({ id: r.id, next: 'approved' })}
              onSuspend={() => handleSuspend(r)}
              onReject={() => handleReject(r)}
            />
          ))}
        </div>
      )}
    </AdminFrame>
  );
}

function ResellerCard({
  Reseller: r,
  busy,
  onApprove,
  onSuspend,
  onReject,
}: {
  Reseller: AdminReseller;
  busy: boolean;
  onApprove: () => void;
  onSuspend: () => void;
  onReject: () => void;
}) {
  const firstName = r.fullName.trim().split(' ')[0];
  const message =
    r.status === 'approved' && r.ResellerCode
      ? `Hi ${firstName}, your Smart Combo Reseller application has been approved. Your Reseller code is ${r.ResellerCode}.`
      : `Hi ${firstName}, this is Smart Combo about your Reseller application.`;

  const btn =
    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div
      className="rounded-xl border border-white/10 p-4"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-white">{r.fullName}</h3>
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${STATUS_CHIP[r.status]}`}>
          {r.status}
        </span>
        {r.ResellerCode && (
          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30">
            {r.ResellerCode}
          </span>
        )}
        <span className="ml-auto text-[11px] text-white/35">Applied {formatDate(r.createdAt)}</span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/60">
        <div className="flex gap-2">
          <dt className="text-white/35 w-16 shrink-0">Phone</dt>
          <dd>{r.phone}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-white/35 w-16 shrink-0">WhatsApp</dt>
          <dd>{r.whatsapp}</dd>
        </div>
        <div className="flex gap-2 min-w-0">
          <dt className="text-white/35 w-16 shrink-0">Email</dt>
          <dd className="truncate">{r.email}</dd>
        </div>
        {r.channel && (
          <div className="flex gap-2 min-w-0">
            <dt className="text-white/35 w-16 shrink-0">Channel</dt>
            <dd className="truncate">{r.channel}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        {r.status === 'pending' && (
          <>
            <button type="button" onClick={onApprove} disabled={busy} className={`btn-primary ${btn}`}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className={`${btn} border border-white/10 text-white/70 hover:border-red-500/40 hover:text-red-300`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reject
            </button>
          </>
        )}
        {r.status === 'approved' && (
          <button
            type="button"
            onClick={onSuspend}
            disabled={busy}
            className={`${btn} border border-white/10 text-white/70 hover:border-red-500/40 hover:text-red-300`}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
            Suspend
          </button>
        )}
        {r.status === 'suspended' && (
          <button type="button" onClick={onApprove} disabled={busy} className={`btn-primary ${btn}`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reinstate
          </button>
        )}

        <a
          href={waLink(r.whatsapp, message)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} border border-white/10 text-white/70 hover:border-primary/40 hover:text-primary sm:ml-auto`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
