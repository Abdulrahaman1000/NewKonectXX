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
function AutoImageSlider({ images, alt }: { images: string[]; alt: string }) {
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
    <div className="relative w-full h-32 sm:h-44 rounded-2xl overflow-hidden bg-black/40 border border-white/10">
      <img
        src={images[index]}
        alt={alt}
        className="w-full h-full object-cover transition-all duration-500"
      />
      {images.length > 1 && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index ? 'w-4 bg-primary' : 'w-1 bg-white/40'
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
    `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
      active
        ? 'bg-primary text-black shadow-lg'
        : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
    }`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome offers"
    >
      {/*
        Three parts: fixed header (tabs + close), scrolling middle, fixed footer
        (main button). On a short phone screen only the middle scrolls, so the
        close button and the main button are always visible.
      */}
      <div
        className="w-full max-w-lg flex flex-col max-h-[90vh] bg-gradient-to-b from-[#14161f] to-[#0c0d12] border border-primary/30 rounded-3xl text-white shadow-[0_0_60px_rgba(255,215,0,0.15)] overflow-hidden"
        style={{ maxHeight: 'calc(100dvh - 1.5rem)' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 p-3 pb-2">
          <div className="flex-1 flex gap-1 min-w-0">
            <button type="button" onClick={() => setActiveTab('gift')} className={tabCls(activeTab === 'gift')}>
              <Gift className="w-3.5 h-3.5" />
              Free Gift
            </button>
            <button type="button" onClick={() => setActiveTab('combo')} className={tabCls(activeTab === 'combo')}>
              <Layers className="w-3.5 h-3.5" />
              Build a Combo
            </button>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrolling content */}
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
          {activeTab === 'gift' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              {giftImages.length > 0 ? (
                <AutoImageSlider images={giftImages} alt="Free gift preview" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-black shadow-lg shadow-primary/20">
                  <Gift className="w-7 h-7" />
                </div>
              )}

              <div>
                <h3 className="text-xl font-black text-white mb-1.5">
                  Spend {formatNaira(GIFT_THRESHOLD)}, Get a Free Gift
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Any order over {formatNaira(GIFT_THRESHOLD)} unlocks a complimentary
                  item from our Gift Vault — yours to pick, at no extra cost.
                </p>
              </div>

              <ul className="space-y-2.5">
                {[
                  'Automatically unlocks in your cart once you qualify',
                  'Choose from several gifts — see photos before you claim',
                  'Zero extra charge, added straight to your order',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-white/70">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60">
                <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>Add items to your cart — your free gift banner shows up automatically.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
              {comboImages.length > 0 ? (
                <AutoImageSlider images={comboImages} alt="Combo builder preview" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black shadow-lg shadow-emerald-500/20">
                  <Sparkles className="w-7 h-7" />
                </div>
              )}

              <div>
                <h3 className="text-xl font-black text-white mb-1.5">
                  Pick 2 or 3, Save ₦5,000
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Mix and match any 2–3 products yourself and get a discount
                  automatically applied — no fixed bundles, your choice entirely.
                </p>
              </div>

              <ul className="space-y-2.5">
                {[
                  'Combine any products you actually want',
                  'Discount is applied instantly at checkout',
                  'Still counts toward your free-gift threshold',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-white/70">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer: main button is always visible */}
        <div className="shrink-0 px-5 pt-3 pb-2 border-t border-white/5">
          {activeTab === 'gift' ? (
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
            className="w-full h-10 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeGiftModal;