/**
 * SearchBar — live combo search component.
 *
 * Used in header. Debounces typing, shows dropdown with results.
 * Closes on result click, Escape, or click outside.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import { searchCombos } from '@/api/combos';
import { formatNaira } from '@/lib/format';
import type { Combo } from '@/types/combo';

interface Props {
  variant?: 'inline' | 'overlay';
  onClose?: () => void;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 1;

export function SearchBar({ variant = 'inline', onClose, autoFocus = false }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LEN) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchCombos(query.trim());
        setResults(res);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        if (variant === 'overlay' && onClose) onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [variant, onClose]);

  const handleSelect = (slug: string) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate(`/combos/${slug}`);
    if (onClose) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      handleSelect(results[0].slug);
    } else if (query.trim()) {
      navigate(`/products?q=${encodeURIComponent(query.trim())}`);
      if (onClose) onClose();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || query.length >= MIN_QUERY_LEN) setOpen(true);
          }}
          placeholder="Search combos..."
          className="w-full pl-9 pr-9 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/40 focus:bg-white/10 focus:outline-none text-sm text-white placeholder-white/40 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        )}
      </form>

      {open && query.trim().length >= MIN_QUERY_LEN && (
        <div
          className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50"
          style={{ background: 'rgba(15, 15, 15, 0.98)', backdropFilter: 'blur(20px)' }}
        >
          {loading && (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-white/60 mb-1">No combos found</p>
              <p className="text-[11px] text-white/35">
                Try different keywords, or{' '}
                <Link
                  to="/products"
                  onClick={() => { setOpen(false); onClose?.(); }}
                  className="text-primary hover:underline"
                >
                  browse all combos
                </Link>
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {results.map((combo) => (
                <button
                  key={combo.id}
                  type="button"
                  onClick={() => handleSelect(combo.slug)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                    {combo.items?.[0]?.images?.[0]?.url ? (
                      <img
                        src={combo.items[0].images[0].url}
                        alt={combo.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{combo.name}</p>
                    {combo.tagline && (
                      <p className="text-[10px] text-white/40 truncate">{combo.tagline}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-primary flex-shrink-0">
                    {formatNaira(combo.totalPrice)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
