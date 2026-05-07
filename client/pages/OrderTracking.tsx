/**
 * Order Tracking page.
 *
 * Customer enters orderNumber + phone to look up an order.
 * Now wired to the real /api/orders/track endpoint.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Package, Search } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { trackOrder } from '@/api/orders';
import { formatNaira } from '@/lib/format';
import type { Order, OrderStatus } from '@/types/order';
import { toast } from 'sonner';

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  pending:    { label: 'Pending Payment',    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  paid:       { label: 'Paid',               color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  processing: { label: 'Processing',         color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  shipped:    { label: 'Shipped',            color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  delivered:  { label: 'Delivered',          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  cancelled:  { label: 'Cancelled',          color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  refunded:   { label: 'Refunded',           color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
};

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const initialOrder = searchParams.get('order') ?? '';

  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await trackOrder(orderNumber.trim(), phone.trim());
      if (!result) {
        toast.error('No order matches those details');
        setOrder(null);
      } else {
        setOrder(result);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Order not found';
      toast.error(msg);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fill order number from URL if present, but require user to add phone
  }, [initialOrder]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-12">
        <div className="container-premium max-w-2xl">
          <div className="text-center mb-10">
            <div className="text-6xl mb-4">📍</div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Track Your Order</h1>
            <p className="text-white/50">
              Enter your order number and phone number to see the latest status.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 p-6 space-y-4 mb-8"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <label className="block">
              <span className="block text-xs font-semibold text-white/60 mb-1.5">Order Number *</span>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors"
                placeholder="SC-2026-000001"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-white/60 mb-1.5">Phone Number *</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white placeholder-white/30 transition-colors"
                placeholder="+2348012345678"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Track Order
                </>
              )}
            </button>
          </form>

          {order && (
            <div
              className="rounded-2xl border border-primary/25 p-6 space-y-5"
              style={{ background: 'rgba(255,215,0,0.02)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-white/40 tracking-widest">Order</p>
                  <p className="text-xl font-black text-white">{order.orderNumber}</p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_LABELS[order.status].color}`}
                >
                  {STATUS_LABELS[order.status].label}
                </span>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-xs uppercase text-white/40 tracking-widest mb-3">Items</p>
                <ul className="space-y-2">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Package className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-white/85">{item.name}</p>
                        <p className="text-white/40 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-white/70 tabular-nums">{formatNaira(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatNaira(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Shipping</span>
                  <span className="tabular-nums">
                    {order.shippingFee === 0 ? 'Free' : formatNaira(order.shippingFee)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-white text-base pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span className="text-primary tabular-nums">{formatNaira(order.total)}</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 text-sm space-y-1">
                <p className="text-xs uppercase text-white/40 tracking-widest mb-2">Shipping to</p>
                <p className="text-white/85 font-medium">{order.shipping.fullName}</p>
                <p className="text-white/60">{order.shipping.street}</p>
                <p className="text-white/60">
                  {order.shipping.city}, {order.shipping.state}
                </p>
                <p className="text-white/60">{order.shipping.phone}</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
