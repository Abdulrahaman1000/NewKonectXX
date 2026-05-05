import { Link } from 'react-router-dom';
import { Menu, ShoppingCart, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/stores/cart';
import { useSettings } from '@/contexts/SettingsContext';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const itemCount = useCart((s) => s.itemCount());
  const openCart = useCart((s) => s.openCart);
  const { settings } = useSettings();
  const storeName = settings?.storeName ?? 'Smart Combo';

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Products', path: '/products' },
    { label: 'Order Tracking', path: '/order-tracking' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-40 glass-card border-b border-[rgba(255,255,255,0.1)]">
      <div className="container-premium">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-[#ffed4e] flex items-center justify-center font-bold text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/30 transition-all">
              SC
            </div>
            <span className="hidden sm:inline font-bold text-lg bg-gradient-to-r from-primary via-accent to-[#ffed4e] bg-clip-text text-transparent">
              {storeName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button
              type="button"
              onClick={openCart}
              aria-label={`Open cart, ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
              className="relative p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1">
                  {itemCount}
                </span>
              )}
            </button>
            <Link to="/checkout" className="btn-primary text-sm">
              Order Now
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={openCart}
              aria-label={`Open cart, ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
              className="relative p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <nav className="md:hidden pb-4 border-t border-[rgba(255,255,255,0.1)] pt-4 space-y-3" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-4 py-2 text-foreground hover:text-primary hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/checkout"
              className="block px-4 py-2 btn-primary text-center text-sm mt-4"
              onClick={() => setIsOpen(false)}
            >
              Order Now
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
