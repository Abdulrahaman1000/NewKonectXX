import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Gift,
  Layers,
  ChevronRight,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';
import { GIFT_THRESHOLD } from '@/stores/cart';
import { formatNaira } from '@/lib/format';
import { fetchCombos } from '@/api/combos';
import { useSettings } from '@/contexts/SettingsContext';
import { cldUrl } from '@/lib/cloudinary';

type Tab = 'gift' | 'combo';

const STORAGE_KEY = 'welcomeGiftModal:lastClosedAt';
const REAPPEAR_AFTER_MS = 10 * 60 * 1000; // 10 minutes

interface GiftItemLite {
  _id: string;
  name: string;
  image: string;
  images?: string[];
}

/** Auto-rotating image strip, reused for both tabs. */
function AutoImageSlider({
  images,
  alt,
  className = '',
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [images]);

  if (images.length === 0) return null;

  return (
    <div className={`relative w-full overflow-hidden bg-muted ${className}`}>
      <img
        src={images[index]}
        alt={alt}
        className="w-full h-full object-cover transition-all duration-500"
      />
      {images.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 shadow ${
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WelcomeGiftModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('gift');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gifts, setGifts] = useState<GiftItemLite[]>([]);

  // Pictures uploaded in Admin > Site Settings > Welcome popup pictures
  const { settings } = useSettings();
  const customGiftImages = (settings?.welcomePopup?.giftImages ?? []).filter(Boolean);
  const customComboImages = (settings?.welcomePopup?.comboImages ?? []).filter(Boolean);
  const hasCustomGift = customGiftImages.length > 0;

  const { data: combos = [] } = useQuery({
    queryKey: ['combos'],
    queryFn: () => fetchCombos(),
  });

  // Decide whether to open now, or schedule opening for later.
  useEffect(() => {
    const lastClosedRaw = localStorage.getItem(STORAGE_KEY);
    const lastClosed = lastClosedRaw ? Number(lastClosedRaw) : 0;
    const elapsed = Date.now() - lastClosed;

    if (!lastClosedRaw || elapsed >= REAPPEAR_AFTER_MS) {
      setIsOpen(true);
    } else {
      const remaining = REAPPEAR_AFTER_MS - elapsed;
      timeoutRef.current = setTimeout(() => setIsOpen(true), remaining);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Fetch gift bank images for the slider
  useEffect(() => {
    if (!isOpen || hasCustomGift) return; // no need to load gifts if custom pictures exist
    (async () => {
      try {
        const res = await fetch('/api/gifts');
        if (res.ok) {
          const json = await res.json();
          const list: GiftItemLite[] = Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.gifts)
            ? json.gifts
            : [];
          setGifts(list.filter((g: any) => g.isActive !== false));
        }
      } catch (err) {
        console.error('Failed to fetch gifts for welcome modal:', err);
      }
    })();
  }, [isOpen, hasCustomGift]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), REAPPEAR_AFTER_MS);
  };

  if (!isOpen) return null;

  const fallbackGiftImages = gifts
    .flatMap((g) => (g.images && g.images.length > 0 ? g.images : [g.image]))
    .filter(Boolean)
    .slice(0, 6);

  const fallbackComboImages = combos
    .map((c) => c.heroImage || c.items?.[0]?.images?.[0]?.url)
    .filter(Boolean)
    .slice(0, 6) as string[];

  const POPUP_IMG = 'w_800,h_400,c_fill,q_auto,f_auto';
  const giftImages = hasCustomGift
    ? customGiftImages.map((u) => cldUrl(u, POPUP_IMG))
    : fallbackGiftImages;
  const comboImages =
    customComboImages.length > 0
      ? customComboImages.map((u) => cldUrl(u, POPUP_IMG))
      : fallbackComboImages;

  const tabCls = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
      active
        ? 'bg-primary text-black shadow-md'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  const isGift = activeTab === 'gift';
  const activeImages = isGift ? giftImages : comboImages;
  const checks = isGift
    ? [
        'Automatically unlocks in your cart once you qualify',
        'Choose from several gifts — see photos before you claim',
        'Zero extra charge, added straight to your order',
      ]
    : [
        'Combine any products you actually want',
        'Discount is applied instantly at checkout',
        'Still counts toward your free-gift threshold',
      ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome offers"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/*
        Phone: one column (tabs on top, scrolling middle, button at the bottom).
        Desktop: two columns - a big picture panel on the left, the offer on
        the right.
      */}
      <div
        className="w-full max-w-lg md:max-w-4xl flex flex-col md:flex-row max-h-[90vh] bg-card text-card-foreground border border-border rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden"
        style={{ maxHeight: 'calc(100dvh - 1.5rem)' }}
      >
        {/* Desktop picture panel */}
        <div className="hidden md:block md:w-[44%] shrink-0 relative">
          {activeImages.length > 0 ? (
            <AutoImageSlider
              images={activeImages}
              alt={isGift ? 'Free gift preview' : 'Combo builder preview'}
              className="h-full min-h-[460px]"
            />
          ) : (
            <div className="h-full min-h-[460px] bg-gradient-to-br from-primary to-amber-500 flex flex-col items-center justify-center text-black p-8 text-center">
              <div className="w-24 h-24 rounded-3xl bg-black/10 flex items-center justify-center mb-6">
                {isGift ? <Gift className="w-12 h-12" /> : <Sparkles className="w-12 h-12" />}
              </div>
              <p className="text-2xl font-black leading-tight">
                {isGift ? 'A free gift on every big order' : 'Build your own combo'}
              </p>
              <p className="text-sm mt-2 text-black/70">Smart Combo · Welcome offers</p>
            </div>
          )}
        </div>

        {/* Right side: tabs, content, buttons */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2 p-3 pb-2 md:p-5 md:pb-2">
            <div className="flex-1 flex gap-1 min-w-0 p-1 rounded-2xl bg-muted">
              <button type="button" onClick={() => setActiveTab('gift')} className={tabCls(isGift)}>
                <Gift className="w-3.5 h-3.5" />
                Free Gift
              </button>
              <button type="button" onClick={() => setActiveTab('combo')} className={tabCls(!isGift)}>
                <Layers className="w-3.5 h-3.5" />
                Build a Combo
              </button>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrolling content */}
          <div className="flex-1 overflow-y-auto px-5 md:px-7 pt-2 pb-4">
            <div
              key={activeTab}
              className={`space-y-4 animate-in fade-in duration-200 ${
                isGift ? 'slide-in-from-right-2' : 'slide-in-from-left-2'
              }`}
            >
              {/* Phone picture (desktop shows it on the left instead) */}
              <div className="md:hidden">
                {activeImages.length > 0 ? (
                  <AutoImageSlider
                    images={activeImages}
                    alt={isGift ? 'Free gift preview' : 'Combo builder preview'}
                    className="h-32 sm:h-44 rounded-2xl border border-border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-black shadow-lg shadow-primary/20">
                    {isGift ? <Gift className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
                  </div>
                )}
              </div>

              <div className="md:pt-4">
                <h3 className="text-xl md:text-3xl font-black text-foreground mb-1.5 md:mb-3 leading-tight">
                  {isGift
                    ? `Spend ${formatNaira(GIFT_THRESHOLD)}, Get a Free Gift`
                    : 'Pick 2 or 3, Save ₦5,000'}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {isGift
                    ? `Any order over ${formatNaira(GIFT_THRESHOLD)} unlocks a complimentary item from our Gift Vault — yours to pick, at no extra cost.`
                    : 'Mix and match any 2–3 products yourself and get a discount automatically applied — no fixed bundles, your choice entirely.'}
                </p>
              </div>

              <ul className="space-y-2.5 md:space-y-3">
                {checks.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2.5 text-xs md:text-sm text-foreground/80"
                  >
                    <span className="mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-600" />
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {isGift && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/25 text-[11px] md:text-xs text-foreground/80">
                  <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>Add items to your cart — your free gift banner shows up automatically.</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer: main button is always visible */}
          <div className="shrink-0 px-5 md:px-7 pt-3 pb-2 md:pb-4 border-t border-border">
            {isGift ? (
              <button
                type="button"
                onClick={handleClose}
                className="btn-primary w-full flex items-center justify-center gap-2 h-12 font-bold"
              >
                Start Shopping
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/products?mode=combo-builder"
                onClick={handleClose}
                className="btn-primary w-full flex items-center justify-center gap-2 h-12 font-bold"
              >
                <Layers className="w-4 h-4" />
                Start Building
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-full h-10 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeGiftModal;
