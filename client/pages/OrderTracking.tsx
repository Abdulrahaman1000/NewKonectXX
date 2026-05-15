/**
 * Order tracking page — /track
 *
 * Customers enter their order number + phone to look up status.
 * Works for guest checkouts (no login required).
 *
 * Read query params on mount so links like /track?order=SC-2026-000001 prefill.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  Phone,
  Search,
  Truck,
  Clock,
  CreditCard,
  Gift,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { trackOrder } from '@/api/orders';
import { formatNaira } from '@/lib/format';
import type { Order, OrderStatus } from '@/types/order';
import { toast } from 'sonner';

interface StatusInfo {
  Icon: typeof Package;
  label: string;
  message: string;
  color: string;        // tailwind text color
  ringColor: string;    // tailwind ring/border color
  bgColor: string;      // background tint
}

const STATUS_MAP: Record<OrderStatus, StatusInfo> = {
  pending: {
    Icon: Clock,
    label: 'Pending Payment',
    message: 'Waiting for your payment to be confirmed.',
    color: 'text-amber-300',
    ringColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
  },
  paid: {
    Icon: CreditCard,
    label: 'Payment Received',
    message: 'Thanks! We will start preparing your combo shortly.',
    color: 'text-blue-300',
    ringColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
  },
  processing: {
    Icon: Gift,
    label: 'Processing',
    message: 'Your order is being packed.',
    color: 'text-yellow-300',
    ringColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
  },
  shipped: {
    Icon: Truck,
    label: 'On The Way',
    message: 'Your order has been shipped and is on its way to you.',
    color: 'text-emerald-300',
    ringColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
  },
  delivered: {
    Icon: Check,
    label: 'Delivered',
    message: 'Your order has been delivered. Enjoy!',
    color: 'text-emerald-300',
    ringColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/15',
  },
  cancelled: {
    Icon: XCircle,
    label: 'Cancelled',
    message: 'This order was cancelled.',
    color: 'text-red-300',
    ringColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
  },
  refunded: {
    Icon: AlertCircle,
    label: 'Refunded',
    message: 'This order has been refunded.',
    color: 'text-white/60',
    ringColor: 'border-white/20',
    bgColor: 'bg-white/5',
  },
};

function formatDate(dateString?: string) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '');
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Auto-lookup if both query params provided
  useEffect(() => {
    if (orderNumber && phone) {
      handleLookup(orderNumber, phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLookup = async (orderNo: string, ph: string) => {
    setLoading(true);
    setNotFound(false);
    setOrder(null);
    try {
      const result = await trackOrder(orderNo.trim(), ph.trim());
      if (result) {
        setOrder(result);
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to look up order');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      toast.error('Enter both order number and phone');
      return;
    }
    handleLookup(orderNumber, phone);
  };

  const reset = () => {
    setOrder(null);
    setNotFound(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Track your order" description="Check the status of your Smart Combo order." />
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-10 md:py-14">
        <div className="container-premium max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-6">
            <ArrowLeft className="w-3 h-3" />
            Back to home
          </Link>

          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-2">Order status</p>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Track Your Order</h1>
            <p className="text-sm text-white/50 max-w-md mx-auto">
              Enter your order number and phone number to check the status.
            </p>
          </div>

          {/* Form (always visible) */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 p-5 md:p-6 mb-6"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="space-y-3">
              <label className="block">
                <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
                  Order Number
                </span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors"
                    placeholder="SC-2026-000001"
                    autoComplete="off"
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
                  Phone Number
                </span>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors"
                    placeholder="+234 814 274 6379"
                    autoComplete="tel"
                  />
                </div>
                <p className="text-[10px] text-white/35 mt-1">
                  Same phone you used at checkout
                </p>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {loading ? 'Searching...' : 'Track Order'}
              </button>
            </div>
          </form>

          {/* Not found message */}
          {notFound && (
            <div className="rounded-2xl border border-red-500/20 p-5 text-center" style={{ background: 'rgba(239,68,68,0.05)' }}>
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white mb-1">Order not found</p>
              <p className="text-xs text-white/50">
                Double-check the order number and phone number. They must match what you used at checkout.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-3 text-xs font-bold text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Order details */}
          {order && <OrderDetails order={order} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function OrderDetails({ order }: { order: Order }) {
  const info = STATUS_MAP[order.status];
  const { Icon } = info;

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div
        className={`rounded-2xl border ${info.ringColor} ${info.bgColor} p-6 md:p-8 text-center`}
      >
        <div className={`inline-flex w-14 h-14 rounded-full ${info.bgColor} ${info.ringColor} border-2 items-center justify-center mb-3`}>
          <Icon className={`w-7 h-7 ${info.color}`} />
        </div>
        <p className={`text-lg md:text-xl font-black ${info.color} mb-1`}>
          {info.label}
        </p>
        <p className="text-sm text-white/65 max-w-md mx-auto">{info.message}</p>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Order</p>
            <p className="text-base md:text-lg font-black text-white">{order.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Placed</p>
            <p className="text-xs md:text-sm text-white/70">{formatDate(order.createdAt)}</p>
          </div>
        </div>

        {/* Timeline */}
        {(order.paidAt || order.shippedAt || order.deliveredAt) && (
          <div className="border-t border-white/5 pt-3 mt-3 space-y-1">
            {order.paidAt && (
              <p className="text-xs text-white/55">
                <span className="text-white/40">💳 Paid:</span> {formatDate(order.paidAt)}
              </p>
            )}
            {order.shippedAt && (
              <p className="text-xs text-white/55">
                <span className="text-white/40">📦 Shipped:</span> {formatDate(order.shippedAt)}
              </p>
            )}
            {order.deliveredAt && (
              <p className="text-xs text-white/55">
                <span className="text-white/40">✅ Delivered:</span> {formatDate(order.deliveredAt)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-white/10 p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">
          Items ({order.items.length})
        </p>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="w-14 h-14 rounded-lg object-cover border border-white/10 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-white/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{item.name}</p>
                {item.variantSummary && (
                  <p className="text-[11px] text-white/55 leading-relaxed">{item.variantSummary}</p>
                )}
                <p className="text-[11px] text-white/40 mt-0.5">
                  ×{item.quantity} · {formatNaira(item.subtotal)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-2xl border border-white/10 p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-white/55">
            <span>Subtotal</span>
            <span>{formatNaira(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-white/55">
            <span>Shipping</span>
            <span>{order.shippingFee === 0 ? 'Free' : formatNaira(order.shippingFee)}</span>
          </div>
          <div className="border-t border-white/10 pt-2 mt-2 flex justify-between items-baseline">
            <span className="font-bold text-white">Total</span>
            <span className="text-xl font-black text-primary">{formatNaira(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="rounded-2xl border border-white/10 p-5 md:p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">Delivery to</p>
        <p className="text-sm font-bold text-white">{order.shipping.fullName}</p>
        <p className="text-xs text-white/60 leading-relaxed">
          {order.shipping.street}
          <br />
          {order.shipping.city}, {order.shipping.state}
          <br />
          {order.shipping.phone}
        </p>
        {order.shipping.landmark && (
          <p className="text-[11px] text-white/40 mt-2 italic">Landmark: {order.shipping.landmark}</p>
        )}
      </div>

      {/* Tracking info */}
      {(order.trackingNumber || order.trackingProviderUrl) && (
        <div className="rounded-2xl border border-emerald-500/20 p-5 md:p-6" style={{ background: 'rgba(16,185,129,0.05)' }}>
          <p className="text-[10px] uppercase tracking-widest text-emerald-300/80 font-bold mb-2">
            Shipment tracking
          </p>
          {order.trackingNumber && (
            <p className="text-sm font-bold text-white mb-2">
              Tracking #: <span className="font-mono">{order.trackingNumber}</span>
            </p>
          )}
          {order.trackingProviderUrl && (
            <a
              href={order.trackingProviderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1.5"
            >
              View on courier website →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
