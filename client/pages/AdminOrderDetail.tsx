/**
 * Admin Order Detail page.
 *
 * Shows everything about an order:
 *  - Customer + shipping address
 *  - Items snapshot with prices
 *  - Totals
 *  - Status updater (dropdown — pending/paid/processing/shipped/delivered/cancelled)
 *  - Tracking URL field (saved on update)
 *  - Admin notes (private — never shown to customer)
 *  - Payment method, paymentReference, paidAt
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrder, updateOrder, updateOrderStatus } from '@/api/adminOrders';
import { formatNaira } from '@/lib/format';
import type { OrderStatus } from '@/types/order';
import { SEO } from '@/components/shared/SEO';
import { toast } from 'sonner';

const STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    'bg-amber-500/15 text-amber-300 border-amber-500/25',
  paid:       'bg-blue-500/15 text-blue-300 border-blue-500/25',
  processing: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  shipped:    'bg-purple-500/15 text-purple-300 border-purple-500/25',
  delivered:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  cancelled:  'bg-red-500/15 text-red-300 border-red-500/25',
  refunded:   'bg-gray-500/15 text-gray-300 border-gray-500/25',
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });

  const [trackingUrl, setTrackingUrl] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Sync local form state when order loads/changes
  useEffect(() => {
    if (order) {
      setTrackingUrl(order.trackingUrl ?? '');
      setAdminNotes(order.adminNotes ?? '');
    }
  }, [order]);

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(id!, status),
    onSuccess: (updated) => {
      toast.success(`Status changed to ${updated.status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const fieldsMutation = useMutation({
    mutationFn: () => updateOrder(id!, { trackingUrl, adminNotes }),
    onSuccess: () => {
      toast.success('Order updated');
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
    },
    onError: () => toast.error('Failed to save'),
  });

  if (isLoading) {
    return (
      <FrameWrapper user={user} onLogout={logout}>
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      </FrameWrapper>
    );
  }

  if (error || !order) {
    return (
      <FrameWrapper user={user} onLogout={logout}>
        <div className="py-20 text-center">
          <p className="text-red-400 mb-4">Order not found</p>
          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="text-xs text-primary hover:underline"
          >
            ← Back to orders
          </button>
        </div>
      </FrameWrapper>
    );
  }

  return (
    <FrameWrapper user={user} onLogout={logout}>
      <SEO title={`Order ${order.orderNumber} — Admin`} />

      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to orders
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Order</p>
          <h1 className="text-2xl md:text-3xl font-black text-white font-mono">
            {order.orderNumber}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Placed {new Date(order.createdAt).toLocaleString('en-NG', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_STYLES[order.status]}`}>
            {order.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: Items + customer */}
        <div className="space-y-6">
          <Card title="Items">
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-14 h-14 rounded-lg object-cover border border-white/10 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    {item.tagline && <p className="text-[11px] text-white/40">{item.tagline}</p>}
                    <p className="text-[11px] text-white/50 mt-1">
                      Qty {item.quantity} × {formatNaira(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary tabular-nums whitespace-nowrap">
                    {formatNaira(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 mt-5 pt-4 space-y-1.5 text-xs">
              <Row label="Subtotal" value={formatNaira(order.subtotal)} />
              <Row label="Shipping" value={order.shippingFee === 0 ? 'Free' : formatNaira(order.shippingFee)} />
            </div>
            <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
              <span className="text-sm text-white/70 font-bold">Total</span>
              <span className="text-xl text-primary font-black tabular-nums">
                {formatNaira(order.total)}
              </span>
            </div>
          </Card>

          <Card title="Customer">
            <p className="text-sm text-white font-bold mb-2">{order.shipping.fullName}</p>
            <div className="space-y-1.5 text-xs">
              <p className="flex items-center gap-2 text-white/70">
                <Phone className="w-3 h-3 text-white/40" />
                {order.shipping.phone}
              </p>
              <p className="flex items-center gap-2 text-white/70">
                <Mail className="w-3 h-3 text-white/40" />
                {order.shipping.email}
              </p>
              <p className="flex items-start gap-2 text-white/70">
                <MapPin className="w-3 h-3 text-white/40 mt-0.5 flex-shrink-0" />
                <span>
                  {order.shipping.street}<br />
                  {order.shipping.landmark && <>{order.shipping.landmark}<br /></>}
                  {order.shipping.city}, {order.shipping.state}
                </span>
              </p>
            </div>
            {order.notes && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Customer note</p>
                <p className="text-xs text-white/60 italic">"{order.notes}"</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Status + admin fields */}
        <div className="space-y-6">
          <Card title="Status">
            <select
              value={order.status}
              onChange={(e) => statusMutation.mutate(e.target.value as OrderStatus)}
              disabled={statusMutation.isPending}
              className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <p className="text-[10px] text-white/30 mt-2">
              Changes save immediately.
            </p>
          </Card>

          <Card title="Payment">
            <div className="space-y-1.5 text-xs">
              <Row label="Method" value={paymentLabel(order.paymentMethod)} />
              {order.paymentReference && (
                <Row label="Reference" value={order.paymentReference} />
              )}
              {order.paidAt && (
                <Row label="Paid at" value={new Date(order.paidAt).toLocaleString('en-NG')} />
              )}
            </div>
          </Card>

          <Card title="Tracking URL">
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://courier.com/track/..."
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-xs text-white placeholder-white/30"
            />
            <p className="text-[10px] text-white/30 mt-2">
              Shown to the customer when they track this order.
            </p>
          </Card>

          <Card title="Admin notes">
            <textarea
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal note (not visible to customer)..."
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-xs text-white placeholder-white/30"
            />
            <button
              type="button"
              onClick={() => fieldsMutation.mutate()}
              disabled={fieldsMutation.isPending}
              className="btn-primary w-full mt-3 py-2 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {fieldsMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save tracking & notes
                </>
              )}
            </button>
          </Card>
        </div>
      </div>
    </FrameWrapper>
  );
}

function paymentLabel(method: string): string {
  const labels: Record<string, string> = {
    bank_transfer: 'Bank transfer',
    cod: 'Cash on delivery',
    paystack: 'Paystack',
    flutterwave: 'Flutterwave',
    whatsapp: 'WhatsApp',
  };
  return labels[method] ?? method;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-white/10 p-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80 text-right">{value}</span>
    </div>
  );
}

function FrameWrapper({
  children,
  user,
  onLogout,
}: {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/95 backdrop-blur">
        <div className="container-premium flex items-center justify-between py-3">
          <Link to="/admin" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-[0_0_16px_rgba(255,215,0,0.3)] group-hover:scale-105 transition-transform">
              <span className="text-black font-black text-sm">SC</span>
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">Smart Combo</p>
              <p className="text-[10px] uppercase tracking-widest text-primary/70 font-bold leading-tight">Admin</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:inline text-xs text-white/50 hover:text-white/80">View store</Link>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300 transition-colors text-xs font-medium text-white/70"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 section-padding py-10">
        <div className="container-premium max-w-6xl">
          {children}
          <p className="mt-8 text-xs text-white/30 text-center">
            Logged in as {user?.email}
          </p>
        </div>
      </main>
    </div>
  );
}
