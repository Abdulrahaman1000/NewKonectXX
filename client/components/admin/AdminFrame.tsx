/**
 * Shared admin layout — top bar with logo, sign out, view store link.
 * Wraps admin pages so we don't repeat the same header in every file.
 */

import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AdminFrame({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

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
          {children}
          <p className="mt-8 text-xs text-white/30 text-center">
            Logged in as {user?.email}
          </p>
        </div>
      </main>
    </div>
  );
}
