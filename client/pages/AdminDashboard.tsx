/**
 * Admin Dashboard.
 * Combos tile now enabled (links to /admin/combos).
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  LayoutGrid,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { SEO } from '@/components/shared/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCombos } from '@/api/combos';
import { getDashboardStats } from '@/api/adminOrders';
import { formatNaira } from '@/lib/format';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const { data: combos = [] } = useQuery({
    queryKey: ['combos'],
    queryFn: () => fetchCombos(),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Admin Dashboard" />

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
            <Link to="/" className="hidden sm:inline text-xs text-white/50 hover:text-white/80 transition-colors">View store</Link>
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
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-primary/70 font-bold mb-2">
              {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-1">
              Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="text-white/45 text-sm">Here's what's happening with your store today.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard label="Orders today" value={(stats?.ordersToday ?? 0).toString()} />
            <StatCard label="Revenue today" value={formatNaira(stats?.revenueToday ?? 0)} />
            <StatCard label="Pending orders" value={(stats?.pendingOrders ?? 0).toString()} />
            <StatCard label="Customers" value={(stats?.customers ?? 0).toString()} />
          </div>

          <h2 className="text-base font-bold text-white mb-4">Manage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            <TileLink to="/admin/orders" Icon={Package} label="Orders" desc="View, fulfill, and update orders" badge={stats?.pendingOrders ?? 0} />
            <TileLink to="/admin/combos" Icon={ShoppingBag} label="Combos" desc="Add, edit, and manage combo products" />
            <TileLink to="/admin/categories" Icon={LayoutGrid} label="Categories" desc="Organize combos by category" />
            <TileLink to="#customers" Icon={Users} label="Customers" desc="Customer list and order history" disabled />
            <TileLink to="#faqs" Icon={HelpCircle} label="FAQs" desc="Manage FAQ entries shown on the site" disabled />
            <TileLink to="#settings" Icon={Settings} label="Site Settings" desc="Hero slides, promo, contact info, video" disabled />
          </div>

          <h2 className="text-base font-bold text-white mb-4">Combos ({combos.length})</h2>
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-xs uppercase text-white/50 tracking-wide">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Categories</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {combos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/40 text-sm">
                      No combos yet.{' '}
                      <Link to="/admin/combos/new" className="text-primary hover:underline">
                        Create one →
                      </Link>
                    </td>
                  </tr>
                )}
                {combos.map((combo) => (
                  <tr key={combo.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{combo.name}</p>
                      <p className="text-white/40 text-xs">{combo.tagline}</p>
                    </td>
                    <td className="px-4 py-3">
                      {(combo.categorySlugs ?? []).length === 0 ? (
                        <span className="text-white/30 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(combo.categorySlugs ?? []).map((slug) => (
                            <span
                              key={slug}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60"
                            >
                              {slug}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70 tabular-nums">{formatNaira(combo.totalPrice)}</td>
                    <td className="px-4 py-3 text-white/70 tabular-nums">{combo.stockLeft}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          combo.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                            : 'bg-gray-500/15 text-gray-300 border-gray-500/25'
                        }`}
                      >
                        {combo.isActive ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-8 text-xs text-white/30 text-center">
            Logged in as {user?.email}
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border border-white/10 p-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

function TileLink({
  to,
  Icon,
  label,
  desc,
  disabled,
  badge,
}: {
  to: string;
  Icon: any;
  label: string;
  desc: string;
  disabled?: boolean;
  badge?: number;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {!!badge && badge > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
            {badge} pending
          </span>
        )}
        {disabled && (
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wide">
            Soon
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold text-white mb-1">{label}</h3>
      <p className="text-xs text-white/50">{desc}</p>
    </>
  );

  const baseCls = 'block text-left p-5 rounded-2xl border transition-colors';
  const enabledCls = 'border-white/10 hover:border-primary/40 cursor-pointer';
  const disabledCls = 'border-white/5 opacity-50 cursor-not-allowed';

  if (disabled) {
    return (
      <div className={`${baseCls} ${disabledCls}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
        {content}
      </div>
    );
  }

  return (
    <Link to={to} className={`${baseCls} ${enabledCls}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
      {content}
    </Link>
  );
}
