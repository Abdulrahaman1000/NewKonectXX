/**
 * MobileBottomNav — app-style tab bar, phones only (< 768px).
 *
 * Mount it ONCE in App.tsx, inside <BrowserRouter> and your SettingsProvider,
 * e.g. right after <Routes>...</Routes>. It renders nothing on desktop.
 *
 * Hidden on: /admin pages, product detail pages (they have their own buy bar),
 * and the combo builder (its sticky bar would collide).
 */

import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, MessageCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useCart } from '@/stores/cart';
import { useMobileLayout } from '@/hooks/useMobileLayout';

const ITEM = 'relative flex-1 h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold';

function Tab({ active, children }: { active: boolean; children: ReactNode }) {
  return <span className={`flex flex-col items-center gap-1 ${active ? 'text-primary' : 'text-white/55'}`}>{children}</span>;
}

export function MobileBottomNav() {
  const isMobile = useMobileLayout();
  const { pathname, search } = useLocation();
  const { settings } = useSettings();
  const openCart = useCart((s) => s.openCart);
  // Cart badge. If your cart store names its list differently, change `items` here.
  const count = useCart((s) => (((s as any).items?.length ?? 0) as number));

  const inBuilder = search.includes('mode=combo-builder');
  if (
    !isMobile ||
    inBuilder ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/combos/')
  ) {
    return null;
  }

  const whatsappLink = settings?.contact?.whatsappLink ?? '#';

  return (
    <>
      {/* Spacer so the bar never covers the bottom of the page */}
      <div aria-hidden style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }} />

      <nav
        aria-label="Main"
        className="fixed bottom-0 inset-x-0 z-40 flex border-t border-white/10 bg-background/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Link to="/" className={ITEM}>
          <Tab active={pathname === '/'}>
            <Home className="w-6 h-6" />
            Home
          </Tab>
        </Link>

        <Link to="/products" className={ITEM}>
          <Tab active={pathname.startsWith('/products')}>
            <LayoutGrid className="w-6 h-6" />
            Shop
          </Tab>
        </Link>

        <Link to="/products?mode=combo-builder" className={ITEM}>
          <Tab active={false}>
            <Sparkles className="w-6 h-6" />
            Build
          </Tab>
        </Link>

        <button type="button" onClick={openCart} className={ITEM} aria-label="Open cart">
          <Tab active={false}>
            <span className="relative">
              <ShoppingBag className="w-6 h-6" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </span>
            Cart
          </Tab>
        </button>

        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={ITEM}>
          <Tab active={false}>
            <MessageCircle className="w-6 h-6" />
            Chat
          </Tab>
        </a>
      </nav>
    </>
  );
}