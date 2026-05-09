/**
 * Order Confirmation page.
 *
 * Reached three ways:
 *  1. From Checkout via state navigation (we have the order data already)
 *  2. From Paystack callback (URL has ?ref=... query — we verify, then show)
 *  3. Direct URL with :orderNumber (we ask for phone to look up)
 *
 * For Paystack, the URL looks like:
 *   /order-confirmation/SC-2026-000010?ref=SC-2026-000010-1715175263000
 *
 * On detecting `ref`, we:
 *  - Call /api/payments/verify/:reference
 *  - If paid → load the now-paid order
 *  - If not → show "payment incomplete" with retry option
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Copy,
  CreditCard,
  Loader2,
  MessageCircle,
  Package,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { useSettings } from '@/contexts/SettingsContext';
import { formatNaira } from '@/lib/format';
import { trackOrder } from '@/api/orders';
import { initializePaystack, verifyPaystackPayment } from '@/api/payments';
import type { Order } from '@/types/order';
import { toast } from 'sonner';

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();

  const stateOrder = (location.state as { order?: Order; phone?: string } | null)?.order;
  const statePhone = (location.state as { order?: Order; phone?: string } | null)?.phone;
  const paystackRef = searchParams.get('ref');

  const [order, setOrder] = useState<Order | null>(stateOrder ?? null);
  const [loading, setLoading] = useState(!stateOrder || !!paystackRef);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'verifying' | 'paid' | 'failed' | 'abandoned'
  >('idle');
  const [retryingPayment, setRetryingPayment] = useState(false);

  const [phoneInput, setPhoneInput] = useState(
    statePhone ?? (orderNumber ? sessionStorage.getItem(`order:${orderNumber}:phone`) ?? '' : ''),
  );
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const fetchOrder = async (phone: string) => {
    if (!orderNumber || !phone) return;
    try {
      const fetched = await trackOrder(orderNumber, phone.trim());
      if (fetched) setOrder(fetched);
      else setRecoveryError("We couldn't find an order with those details.");
    } catch {
      setRecoveryError('Something went wrong. Try again.');
    }
  };

  // Step 1: handle Paystack return
  useEffect(() => {
    let cancelled = false;
    async function handle() {
      if (!paystackRef) {
        if (!order && statePhone) await fetchOrder(statePhone);
        if (!cancelled) setLoading(false);
        return;
      }
      setPaymentStatus('verifying');
      try {
        const result = await verifyPaystackPayment(paystackRef);
        if (cancelled) return;
        if (result.paid) {
          setPaymentStatus('paid');
          // Load the now-paid order
          const phone = statePhone || sessionStorage.getItem(`order:${orderNumber}:phone`) || '';
          if (phone) await fetchOrder(phone);
          toast.success('Payment confirmed! 🎉');
        } else {
          setPaymentStatus(
            result.status === 'abandoned' ? 'abandoned' : 'failed',
          );
          // Try to load order anyway (status will still be 'pending')
          const phone = statePhone || sessionStorage.getItem(`order:${orderNumber}:phone`) || '';
          if (phone) await fetchOrder(phone);
        }
      } catch {
        if (!cancelled) {
          setPaymentStatus('failed');
          toast.error('Payment verification failed. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    handle();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  const handleRecoveryFetch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setRecoveryError(null);
    setLoading(true);
    await fetchOrder(phoneInput.trim());
    setLoading(false);
  };

  const copyOrderNumber = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.orderNumber).then(() => {
      setCopied(true);
      toast.success('Order number copied');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const retryPaystack = async () => {
    if (!order) return;
    setRetryingPayment(true);
    try {
      const init = await initializePaystack(order.orderNumber);
      window.location.href = init.authorizationUrl;
    } catch (err: any) {
      toast.error(err?.message || 'Could not start payment');
    } finally {
      setRetryingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-10">
        <div className="container-premium max-w-3xl">
          {/* Need phone — direct URL access without state */}
          {!order && !loading && (
            <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h1 className="text-xl font-black text-white mb-2">
                Confirm your order details
              </h1>
              <p className="text-sm text-white/50 mb-4">
                Enter the phone number used for order <span className="font-bold text-white/80">{orderNumber}</span>.
              </p>
              <form onSubmit={handleRecoveryFetch} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-sm text-white"
                />
                <button type="submit" className="btn-primary px-5 py-2.5 text-sm font-bold">
                  Continue
                </button>
              </form>
              {recoveryError && <p className="mt-3 text-xs text-red-400">{recoveryError}</p>}
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <p className="text-white/50 text-sm mt-4">
                {paymentStatus === 'verifying'
                  ? 'Verifying your payment...'
                  : 'Loading your order...'}
              </p>
            </div>
          )}

          {order && (
            <>
              {/* Hero — varies by payment status */}
              {paymentStatus === 'failed' || paymentStatus === 'abandoned' ? (
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.28em] text-amber-400 font-bold mb-2">
                    Payment {paymentStatus === 'abandoned' ? 'cancelled' : 'incomplete'}
                  </p>
                  <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
                    Your order is held for {order.shipping.fullName.split(' ')[0]}
                  </h1>
                  <p className="text-white/50 text-sm max-w-md mx-auto mb-6">
                    Your order is created and stock is reserved. Complete payment below to ship it out.
                  </p>
                  <button
                    type="button"
                    onClick={retryPaystack}
                    disabled={retryingPayment}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold disabled:opacity-50"
                  >
                    {retryingPayment ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
                    ) : (
                      <><CreditCard className="w-4 h-4" />Pay {formatNaira(order.total)} now</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.28em] text-emerald-400 font-bold mb-2">
                    {paymentStatus === 'paid' ? 'Payment confirmed' : 'Order received'}
                  </p>
                  <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
                    Thank you, {order.shipping.fullName.split(' ')[0]} 🎉
                  </h1>
                  <p className="text-white/50 text-sm max-w-md mx-auto">
                    {paymentStatus === 'paid'
                      ? "We've received your payment. Your combo is being prepared for shipment."
                      : "We've received your order and will be in touch shortly."}
                  </p>
                </div>
              )}

              {/* Order number */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5">
                  <span className="text-xs text-white/50">Order #</span>
                  <span className="font-mono font-bold text-primary">{order.orderNumber}</span>
                  <button
                    type="button"
                    onClick={copyOrderNumber}
                    className="ml-1 text-white/40 hover:text-primary transition-colors"
                    aria-label="Copy"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Payment instructions (only for non-Paystack methods OR if Paystack failed) */}
              {paymentStatus !== 'paid' && order.status !== 'paid' && order.status !== 'processing' && order.status !== 'shipped' && order.status !== 'delivered' && (
                <PaymentInstructions order={order} settings={settings} />
              )}

              {/* Order details */}
              <div className="rounded-2xl border border-white/10 p-5 mb-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Order details
                </h2>

                <div className="space-y-3 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      {item.thumbnailUrl && (
                        <img src={item.thumbnailUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover border border-white/10" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{item.name}</p>
                        <p className="text-[11px] text-white/40">Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-primary tabular-nums">{formatNaira(item.subtotal)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-1.5 text-xs">
                  <Row label="Subtotal" value={formatNaira(order.subtotal)} />
                  <Row label="Shipping" value={order.shippingFee === 0 ? 'Free' : formatNaira(order.shippingFee)} />
                </div>
                <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
                  <span className="text-sm text-white/70 font-bold">Total</span>
                  <span className="text-xl text-primary font-black tabular-nums">{formatNaira(order.total)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-5 mb-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <h2 className="text-sm font-black text-white mb-3">Deliver to</h2>
                <div className="text-sm text-white/70 space-y-0.5">
                  <p className="text-white font-medium">{order.shipping.fullName}</p>
                  <p>{order.shipping.street}</p>
                  {order.shipping.landmark && <p className="text-white/50">{order.shipping.landmark}</p>}
                  <p>{order.shipping.city}, {order.shipping.state}</p>
                  <p className="pt-1">{order.shipping.phone} · {order.shipping.email}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={`/order-tracking?order=${encodeURIComponent(order.orderNumber)}`}
                  className="btn-secondary flex-1 py-3 text-sm font-bold text-center"
                >
                  Track this order
                </Link>
                {settings?.contact?.whatsappLink && (
                  <a
                    href={settings.contact.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat with us
                  </a>
                )}
              </div>

              <p className="mt-6 text-center text-[11px] text-white/30">
                A confirmation will be sent to {order.shipping.email}
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PaymentInstructions({ order, settings }: { order: Order; settings: any }) {
  if (order.paymentMethod === 'cod') {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 mb-5">
        <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold mb-2">Cash on delivery</p>
        <p className="text-sm text-white/80 mb-1">
          You'll pay <span className="font-black text-emerald-300">{formatNaira(order.total)}</span> when our courier delivers your combo.
        </p>
        <p className="text-xs text-white/50">Estimated delivery: 1-2 business days.</p>
      </div>
    );
  }

  if (order.paymentMethod === 'bank_transfer') {
    const bank = settings?.bankAccount;
    return (
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 mb-5">
        <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Bank transfer</p>
        <p className="text-sm text-white/80 mb-4">
          Transfer <span className="font-black text-primary">{formatNaira(order.total)}</span> to the account below.
        </p>
        {bank?.accountNumber ? (
          <div className="rounded-lg bg-black/30 border border-white/10 p-4 space-y-2">
            <BankRow label="Bank" value={bank.bankName} />
            <BankRow label="Account name" value={bank.accountName} />
            <BankRow label="Account number" value={bank.accountNumber} copyable />
            <div className="border-t border-white/10 pt-2 mt-3">
              <p className="text-[11px] text-white/40">
                Use your order number <span className="font-mono text-primary">{order.orderNumber}</span> as the reference.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-300">Bank details not configured. We'll send them to you shortly.</p>
        )}
      </div>
    );
  }

  if (order.paymentMethod === 'whatsapp') {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 mb-5">
        <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold mb-2">WhatsApp payment</p>
        <p className="text-sm text-white/80 mb-3">
          We'll message you on WhatsApp at <span className="font-bold text-white">{order.shipping.phone}</span>.
        </p>
      </div>
    );
  }

  if (order.paymentMethod === 'paystack') {
    return null; // Handled in main hero
  }

  return null;
}

function BankRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono font-bold text-white">{value}</span>
        {copyable && (
          <button type="button" onClick={handleCopy} className="text-white/40 hover:text-primary" aria-label={`Copy ${label}`}>
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className="text-white/80 tabular-nums font-medium">{value}</span>
    </div>
  );
}
