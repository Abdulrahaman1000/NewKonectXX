import { Link } from 'react-router-dom';
import { ChevronDown, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/stores/cart';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchCategories } from '@/api/categories';
import { SearchBar } from '@/components/shared/SearchBar';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const itemCount = useCart((s) => s.itemCount());
  const openCart = useCart((s) => s.openCart);
  const { settings } = useSettings();
  const storeName = settings?.storeName ?? 'Smart Combo';

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <header className="sticky top-0 z-40 glass-card border-b border-[rgba(255,255,255,0.1)]">
      <div className="container-premium">
        <div className="flex items-center justify-between h-20 gap-3 md:gap-4">
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-[#ffed4e] flex items-center justify-center font-bold text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/30 transition-all">
              SC
            </div>
            <span className="hidden sm:inline font-bold text-lg bg-gradient-to-r from-primary via-accent to-[#ffed4e] bg-clip-text text-transparent">
              {storeName}
            </span>
          </Link>

          {/* Desktop search bar */}
          <div className="hidden md:block flex-1 max-w-md">
            <SearchBar variant="inline" />
          </div>

          <nav className="hidden lg:flex items-center gap-5" aria-label="Primary">
            <Link
              to="/"
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              Home
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setCategoriesOpen(true)}
              onMouseLeave={() => setCategoriesOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                aria-haspopup="true"
                aria-expanded={categoriesOpen}
              >
                Products
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoriesOpen && (
                <div className="absolute top-full right-0 pt-3">
                  <div
                    className="w-72 rounded-2xl border border-white/10 p-2 shadow-2xl"
                    style={{ background: 'rgba(15, 15, 15, 0.98)', backdropFilter: 'blur(20px)' }}
                  >
                    <Link
                      to="/products"
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 text-sm font-bold text-white"
                    >
                      <span>All combos</span>
                      <span className="text-[10px] uppercase tracking-wider text-primary/70">View all</span>
                    </Link>
                    <div className="border-t border-white/10 my-2" />
                    {categories.length === 0 && (
                      <p className="px-3 py-2 text-xs text-white/40">No categories yet</p>
                    )}
                    {categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        to={`/categories/${cat.slug}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <span className="text-lg">{cat.icon || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{cat.name}</p>
                          {cat.description && (
                            <p className="text-[10px] text-white/40 truncate">{cat.description}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                    <div className="border-t border-white/10 my-2" />
                    <Link
                      to="/categories"
                      className="block px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-primary text-center font-bold"
                    >
                      Browse all categories →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/order-tracking"
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              Track Order
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={openCart}
              className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5 text-white/80" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-white/5"
              aria-label="Search"
            >
              {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={openCart}
              className="relative p-2 rounded-lg hover:bg-white/5"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5 text-white/80" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-white/5"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search overlay */}
        {mobileSearchOpen && (
          <div className="md:hidden py-3 border-t border-white/10">
            <SearchBar
              variant="overlay"
              autoFocus
              onClose={() => setMobileSearchOpen(false)}
            />
          </div>
        )}

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <Link to="/" onClick={toggleMenu} className="block py-2 text-sm">Home</Link>
            <Link to="/products" onClick={toggleMenu} className="block py-2 text-sm">All Products</Link>
            <Link to="/categories" onClick={toggleMenu} className="block py-2 text-sm">Categories</Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/categories/${cat.slug}`}
                onClick={toggleMenu}
                className="flex items-center gap-2 py-2 pl-3 text-xs text-white/70"
              >
                <span>{cat.icon || '📦'}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
            <Link to="/order-tracking" onClick={toggleMenu} className="block py-2 text-sm">Track Order</Link>
            <Link to="/contact" onClick={toggleMenu} className="block py-2 text-sm">Contact</Link>
            <button
              type="button"
              onClick={() => { openCart(); toggleMenu(); }}
              className="block py-2 text-sm w-full text-left"
            >
              Cart {itemCount > 0 && `(${itemCount})`}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
