/**
 * Admin Orders list page.
 *
 * Shows all orders in a table with:
 *  - Status filter chips (All / Pending / Paid / Processing / Shipped / Delivered / Cancelled)
 *  - Search by order number, name, phone, or email
 *  - Pagination
 *  - Click any row to view detail
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, LogOut, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listOrders } from '@/api/adminOrders';
import { formatNaira } from '@/lib/format';
import type { OrderStatus } from '@/types/order';
import { SEO } from '@/components/shared/SEO';

const STATUS_FILTERS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all',        label: 'All' },
  { value: 'pending',    label: 'Pending' },
  { value: 'paid',       label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped',    label: 'Shipped' },
  { value: 'delivered',  label: 'Delivered' },
  { value: 'cancelled',  label: 'Cancelled' },
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

export default function AdminOrders() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders', status, search, page],
    queryFn: () => listOrders({ status, search, page, limit: 25 }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const orders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Orders — Admin" />

      {/* Top bar */}
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
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300 transition-colors text-xs font-medium text-white/70"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 section-padding py-10">
        <div className="container-premium">
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
            <ArrowLeft className="w-3 h-3" />
            Back to dashboard
          </Link>

          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Orders</h1>
              <p className="text-white/50 text-sm mt-1">
                {meta ? `${meta.total} total` : 'Loading...'}
              </p>
            </div>
          </div>

          {/* Filters + search */}
          <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => { setStatus(filter.value); setPage(1); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    status === filter.value
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, phone, order #..."
                className="pl-9 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-primary/40 focus:outline-none text-xs text-white placeholder-white/30 w-full sm:w-72"
              />
            </form>
          </div>

          {/* Table */}
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            {isLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-400 text-sm">
                Failed to load orders. Try refreshing.
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center text-white/40 text-sm">
                No orders match your filters.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase text-white/50 tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Order #</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Items</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const id = order._id ?? order.id ?? '';
                    return (
                      <tr
                        key={id}
                        onClick={() => navigate(`/admin/orders/${id}`)}
                        className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-primary text-xs">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium text-xs">{order.shipping.fullName}</p>
                          <p className="text-white/40 text-[10px]">{order.shipping.phone}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-white/60 text-xs">
                          {order.items.reduce((s, i) => s + i.quantity, 0)} item{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-white tabular-nums font-medium text-xs">
                          {formatNaira(order.total)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[order.status]}`}>
                            {order.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-white/40 text-xs">
                          {new Date(order.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-white/40">
                Page {meta.page} of {meta.pages} · {meta.total} orders
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <button
                  type="button"
                  disabled={page >= meta.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-xs text-white/30 text-center">
            Logged in as {user?.email}
          </p>
        </div>
      </main>
    </div>
  );
}
