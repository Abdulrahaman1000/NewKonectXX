/**
 * Customer Dashboard — skeleton.
 *
 * This page requires authentication, which doesn't exist yet.
 * For now it shows a "sign in" pitch. After backend auth lands,
 * wire useAuth() here, then render real order history.
 */

import { Link } from 'react-router-dom';
import { ChevronRight, Package, Heart, MapPin, User } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';

const FEATURES = [
  { Icon: Package, title: 'Order History',  desc: 'See all your past orders and track current ones in one place.' },
  { Icon: Heart,   title: 'Wishlist',       desc: 'Save combos you like for later — never lose track of a favorite.' },
  { Icon: MapPin,  title: 'Saved Addresses', desc: 'Check out faster with multiple saved delivery addresses.' },
  { Icon: User,    title: 'Profile',        desc: 'Manage your contact info, password, and notification preferences.' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="My Account" description="Your Smart Combo account dashboard." />
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-12">
        <div className="container-premium max-w-3xl">
          <div className="text-center mb-12">
            <div className="text-6xl mb-3">👤</div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Your Dashboard</h1>
            <p className="text-white/50">
              Customer accounts are coming soon. For now, track your order using your order number and phone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-2xl border border-white/10"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-sm font-bold text-white mb-1">{title}</h2>
                <p className="text-xs text-white/50">{desc}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl border border-primary/25 p-6 text-center"
            style={{ background: 'rgba(255,215,0,0.04)' }}
          >
            <p className="text-sm text-white/70 mb-4">
              Need to track an order right now?
            </p>
            <Link
              to="/order-tracking"
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              Track Your Order
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
