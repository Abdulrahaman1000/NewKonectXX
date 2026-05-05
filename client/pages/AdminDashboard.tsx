/**
 * Admin Dashboard — skeleton.
 *
 * Currently shows the structure of what the admin panel will look like.
 * No real data — needs backend + auth before this becomes functional.
 *
 * When backend lands, replace the mock numbers with real queries:
 *   const { data: stats } = useQuery({ queryKey: ['admin','stats'], queryFn: fetchAdminStats });
 *   const { data: recentOrders } = useQuery({ queryKey: ['admin','orders'], queryFn: fetchRecentOrders });
 *
 * Also: protect this route. Add ProtectedRoute wrapper checking for admin role.
 */

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  HelpCircle,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';
import { fetchCombos } from '@/api/combos';
import { formatNaira } from '@/lib/format';

// Mock stats — replace with real API call
const MOCK_STATS = {
  ordersToday: 0,
  revenueToday: 0,
  pendingOrders: 0,
  customers: 0,
};

const QUICK_LINKS = [
  { Icon: ShoppingBag, label: 'Combos',       href: '#combos',       desc: 'Add, edit, and manage combo products' },
  { Icon: Package,     label: 'Orders',       href: '#orders',       desc: 'View, fulfill, and update orders' },
  { Icon: Users,       label: 'Customers',    href: '#customers',    desc: 'Customer list and order history' },
  { Icon: HelpCircle,  label: 'FAQs',         href: '#faqs',         desc: 'Manage FAQ entries shown on the site' },
  { Icon: Settings,    label: 'Site Settings', href: '#settings',    desc: 'Hero slides, promo, contact info, video' },
];

export default function AdminDashboard() {
  const { data: combos = [] } = useQuery({ queryKey: ['combos'], queryFn: fetchCombos });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Admin Dashboard" />
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-10">
        <div className="container-premium">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Admin Dashboard</h1>
              <p className="text-white/45 text-sm">Manage your store</p>
            </div>
          </div>

          {/* Auth notice — remove after auth is wired */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3 mb-8">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-200 mb-1">Skeleton mode</p>
              <p className="text-amber-200/70 text-xs">
                This page is a UI skeleton. Authentication, role checks, and real data hookups will be wired up
                when the backend is built. Do not deploy this route to production without securing it.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard label="Orders today" value={MOCK_STATS.ordersToday.toString()} />
            <StatCard label="Revenue today" value={formatNaira(MOCK_STATS.revenueToday)} />
            <StatCard label="Pending orders" value={MOCK_STATS.pendingOrders.toString()} />
            <StatCard label="Customers" value={MOCK_STATS.customers.toString()} />
          </div>

          {/* Quick links */}
          <h2 className="text-base font-bold text-white mb-4">Manage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {QUICK_LINKS.map(({ Icon, label, desc }) => (
              <button
                key={label}
                type="button"
                className="text-left p-5 rounded-2xl border border-white/10 hover:border-primary/40 transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{label}</h3>
                <p className="text-xs text-white/50">{desc}</p>
              </button>
            ))}
          </div>

          {/* Combos table preview */}
          <h2 className="text-base font-bold text-white mb-4">Combos ({combos.length})</h2>
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-xs uppercase text-white/50 tracking-wide">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {combos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/40 text-sm">
                      No combos yet.
                    </td>
                  </tr>
                )}
                {combos.map((combo) => (
                  <tr key={combo.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{combo.name}</p>
                      <p className="text-white/40 text-xs">{combo.tagline}</p>
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
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="text-xs text-primary hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
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
