import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
  Gift,
  Check,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useCart, GIFT_THRESHOLD } from '@/stores/cart';
import { formatNaira } from '@/lib/format';
import type { CartItem } from '@/types/order';

export interface GiftItem {
  _id: string;
  name: string;
  image: string;
  images?: string[];
  price: number;
  stock: number;
  isActive: boolean;
  description?: string;
}

function GiftImageCarousel({
  images,
  fallbackImage,
  name,
}: {
  images?: string[];
  fallbackImage: string;
  name: string;
}) {
  const imageList =
    images && images.length > 0 ? images : [fallbackImage].filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 group/img">
      <img
        src={imageList[currentIndex] || fallbackImage}
        alt={`${name} - View ${currentIndex + 1}`}
        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
      />
      {imageList.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevImage}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover/img:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={nextImage}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover/img:opacity-100 transition-opacity z-10"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 z-10">
            {imageList.map((_, idx) => (
              <span
                key={idx}
                className={`h-1 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-primary w-2.5' : 'bg-white/40 w-1'
                }`}
              />
            ))}
          </div>
        </>
      )}
      <span className="absolute top-1.5 left-1.5 bg-emerald-500 text-black font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm z-10">
        FREE
      </span>
    </div>
  );
}

export function CartDrawer() {
  const {
    items,
    customComboGroups,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
    savings,
    qualifiesForFreeGift,
    selectedFreeGift,
    selectFreeGift,
    removeFreeGift,
  } = useCart();

  const [availableGifts, setAvailableGifts] = useState<GiftItem[]>([]);
  const [isGiftsLoading, setIsGiftsLoading] = useState<boolean>(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  const [viewingDetailGift, setViewingDetailGift] = useState<GiftItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchGifts();
    }
  }, [isOpen]);

  const fetchGifts = async () => {
    setIsGiftsLoading(true);
    try {
      const res = await fetch('/api/gifts');
      if (res.ok) {
        const json = await res.json();
        const list: GiftItem[] = Array.isArray(json)
          ? json
          : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.gifts)
          ? json.gifts
          : [];

        setAvailableGifts(list.filter((g) => g.stock > 0 && g.isActive !== false));
      }
    } catch (err) {
      console.error('Failed to fetch gifts:', err);
      setAvailableGifts([]);
    } finally {
      setIsGiftsLoading(false);
    }
  };

  const handleOpenDetail = (gift: GiftItem) => {
    setViewingDetailGift(gift);
    setActiveImageIndex(0);
  };

  const handleCloseDetail = () => {
    setViewingDetailGift(null);
    setActiveImageIndex(0);
  };

  const handleCloseGiftModal = () => {
    setIsGiftModalOpen(false);
    setViewingDetailGift(null);
    setActiveImageIndex(0);
  };

  const handleSelectGift = (gift: GiftItem) => {
    selectFreeGift({
      id: gift._id,
      name: gift.name,
      image: gift.image,
      price: gift.price,
    });
    handleCloseGiftModal();
  };

  if (!isOpen) return null;

  const currentSubtotal = subtotal();
  const isQualified = qualifiesForFreeGift();
  const currentGift = selectedFreeGift();
  const remainingForGift = Math.max(0, GIFT_THRESHOLD - currentSubtotal);
  const progressPercent = Math.min(
    100,
    Math.round((currentSubtotal / GIFT_THRESHOLD) * 100),
  );

  const displayItems = items.filter((i: CartItem) => !i.isFreeGift);
  const standaloneItems = displayItems.filter((i: CartItem) => !i.comboGroupId);
  const groupsMap = new Map<string, CartItem[]>();
  displayItems.forEach((i: CartItem) => {
    if (!i.comboGroupId) return;
    const list = groupsMap.get(i.comboGroupId) ?? [];
    list.push(i);
    groupsMap.set(i.comboGroupId, list);
  });

  const removeWholeGroup = (groupId: string, groupItems: CartItem[]) => {
    groupItems.forEach((i) => removeItem(i.comboId, groupId));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        className="relative w-full max-w-md bg-background border-l border-white/10 flex flex-col shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Your Cart</h2>
            <span className="text-xs text-white/40">
              ({displayItems.length} item{displayItems.length !== 1 ? 's' : ''})
            </span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {displayItems.length > 0 && (
          <div className="px-5 pt-3">
            {!isQualified ? (
              <div className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Unlock a Free Gift!</span>
                  </div>
                  <span className="text-amber-400 font-bold">
                    Add {formatNaira(remainingForGift)} more
                  </span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-white/50 mt-2">
                  Orders {formatNaira(GIFT_THRESHOLD)}+ qualify for a free gift.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-wide">
                      Free Gift Unlocked
                    </h4>
                    <p className="text-xs text-emerald-400 font-medium truncate">
                      {currentGift ? `Claimed: ${currentGift.comboName}` : 'Choose 1 free gift'}
                    </p>
                  </div>
                </div>

                {currentGift ? (
                  <button
                    type="button"
                    onClick={removeFreeGift}
                    className="text-[11px] text-white/60 hover:text-white font-semibold underline px-2 py-1 flex-shrink-0"
                  >
                    Change
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsGiftModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-lg flex-shrink-0"
                  >
                    Select Gift
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {displayItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-white/50">
              <div className="text-5xl">🛒</div>
              <p className="text-sm">Your cart is empty</p>
              <button
                type="button"
                onClick={closeCart}
                className="text-primary text-sm hover:underline mt-2"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(groupsMap.entries()).map(([groupId, groupItems]) => {
                const group = customComboGroups.find((g: any) => g.id === groupId);
                return (
                  <div
                    key={groupId}
                    className="rounded-xl border border-primary/25 overflow-hidden"
                    style={{ background: 'rgba(255,215,0,0.03)' }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-primary/15">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        Your Custom Combo
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWholeGroup(groupId, groupItems)}
                        className="ml-auto text-[10px] text-white/40 hover:text-red-400 transition-colors"
                      >
                        Remove combo
                      </button>
                    </div>

                    <ul className="divide-y divide-white/5">
                      {groupItems.map((item) => (
                        <li key={item.comboId} className="p-3">
                          <div className="flex gap-3">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.comboName}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {item.comboName}
                              </p>
                              <p className="text-sm font-bold text-primary">
                                {formatNaira(item.unitPrice)}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 border border-white/10 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(item.comboId, item.quantity - 1, groupId)
                                    }
                                    aria-label="Decrease quantity"
                                    className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-l-lg transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-xs font-bold text-white w-5 text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(item.comboId, item.quantity + 1, groupId)
                                    }
                                    aria-label="Increase quantity"
                                    className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-r-lg transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.comboId, groupId)}
                                  aria-label={`Remove ${item.comboName} from cart`}
                                  className="text-white/40 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {group && group.discount > 0 && (
                      <div className="flex items-center justify-between px-3 py-2.5 bg-primary/10 border-t border-primary/15">
                        <span className="text-xs font-bold text-primary">Combo discount</span>
                        <span className="text-xs font-bold text-primary">
                          − {formatNaira(group.discount)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {standaloneItems.length > 0 && (
                <ul className="space-y-4">
                  {standaloneItems.map((item) => (
                    <li
                      key={item.comboId}
                      className="p-3 rounded-xl border border-white/10"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="flex gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.comboName}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {item.comboName}
                          </p>
                          <p className="text-xs text-white/40 line-through">
                            {formatNaira(item.originalPrice)}
                          </p>
                          <p className="text-sm font-bold text-primary">
                            {formatNaira(item.unitPrice)}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 border border-white/10 rounded-lg">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.comboId, item.quantity - 1)}
                                aria-label="Decrease quantity"
                                className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-l-lg transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-bold text-white w-6 text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.comboId, item.quantity + 1)}
                                aria-label="Increase quantity"
                                className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-r-lg transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.comboId)}
                              aria-label={`Remove ${item.comboName} from cart`}
                              className="text-white/40 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {currentGift && (
                <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
                  {currentGift.image && (
                    <img
                      src={currentGift.image}
                      alt={currentGift.comboName}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary">Free Gift</span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">
                      {currentGift.comboName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFreeGift}
                    aria-label="Remove free gift"
                    className="text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {displayItems.length > 0 && (
          <footer className="border-t border-white/10 p-5 space-y-4">
            {savings() > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400">You save</span>
                <span className="text-emerald-400 font-bold">− {formatNaira(savings())}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-white/60">Subtotal</span>
              <span className="text-2xl font-black text-primary">
                {formatNaira(subtotal())}
              </span>
            </div>
            <p className="text-[11px] text-white/35 text-center">
              Shipping calculated at checkout
            </p>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-bold"
            >
              <ShoppingBag className="w-4 h-4" />
              Proceed to Checkout
            </Link>
          </footer>
        )}
      </aside>

      {/* Free Gift Vault Modal — two screens: grid, then detail (styled like the product detail page) */}
      {isGiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-gradient-to-b from-[#14161f] to-[#0c0d12] border border-primary/30 p-4 sm:p-6 rounded-3xl text-white shadow-[0_0_60px_rgba(255,215,0,0.15)] relative space-y-4 z-20 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {viewingDetailGift ? (
                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white font-semibold transition-colors flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to all gifts
                  </button>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-black font-black shadow-lg shadow-primary/20 flex-shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-extrabold tracking-wide text-white truncate">
                          Free Gift Vault
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 flex-shrink-0">
                          <Zap className="w-2.5 h-2.5" /> 100% Free
                        </span>
                      </div>
                      <p className="text-xs text-white/50">
                        Choose 1 complimentary item to add to your order
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseGiftModal}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!viewingDetailGift && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Tap any gift to see full photos and details. Items selected carry <b>₦0</b> extra charge.
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[250px]">
              {viewingDetailGift ? (
                /* SCREEN 2: PRODUCT-PAGE-STYLE DETAIL */
                (() => {
                  const imageList =
                    viewingDetailGift.images && viewingDetailGift.images.length > 0
                      ? viewingDetailGift.images
                      : [viewingDetailGift.image].filter(Boolean);
                  const hasValue = (viewingDetailGift.price || 0) > 0;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                      {/* Left: image + thumbnails */}
                      <div className="space-y-3">
                        <div className="w-full aspect-square md:aspect-auto md:h-80 rounded-2xl overflow-hidden bg-black/60 border border-white/10 relative">
                          <img
                            src={imageList[activeImageIndex] || viewingDetailGift.image}
                            alt={`${viewingDetailGift.name} - View ${activeImageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {imageList.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {imageList.map((imgUrl, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveImageIndex(idx)}
                                className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                                  idx === activeImageIndex
                                    ? 'border-primary ring-2 ring-primary/40 opacity-100 scale-105'
                                    : 'border-white/10 opacity-50 hover:opacity-100'
                                }`}
                              >
                                <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: title, price, savings, description, claim button — mirrors the product page layout */}
                      <div className="flex flex-col">
                        <span className="inline-flex w-fit items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 mb-3">
                          <Gift className="w-3 h-3" /> Free Gift
                        </span>

                        <h3 className="text-xl sm:text-2xl font-black text-white mb-3">
                          {viewingDetailGift.name}
                        </h3>

                        <div className="h-px bg-white/10 mb-3" />

                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl sm:text-3xl font-black text-primary">FREE</span>
                          {hasValue && (
                            <span className="text-base text-white/40 line-through">
                              {formatNaira(viewingDetailGift.price)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          {hasValue && (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                              SAVE {formatNaira(viewingDetailGift.price)} (100% OFF)
                            </span>
                          )}
                          {viewingDetailGift.stock <= 5 && (
                            <span className="text-[11px] text-amber-400 font-semibold">
                              Only {viewingDetailGift.stock} left
                            </span>
                          )}
                        </div>

                        {viewingDetailGift.description && (
                          <p className="text-sm text-white/60 leading-relaxed mb-5">
                            {viewingDetailGift.description}
                          </p>
                        )}

                        <div className="mt-auto space-y-3">
                          <button
                            type="button"
                            onClick={() => handleSelectGift(viewingDetailGift)}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-bold"
                          >
                            <Check className="w-4 h-4" />
                            Claim This Free Gift
                          </button>
                          <p className="text-[11px] text-white/35 text-center flex items-center justify-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Adds ₦0 to your order total
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : isGiftsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-white/60 animate-pulse">Loading available gifts...</p>
                </div>
              ) : !Array.isArray(availableGifts) || availableGifts.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">🎁</div>
                  <p className="text-sm font-medium text-white/60">
                    No free gifts currently available.
                  </p>
                </div>
              ) : (
                /* SCREEN 1: GRID */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableGifts.map((gift) => (
                    <div
                      key={gift._id}
                      onClick={() => handleOpenDetail(gift)}
                      className="group relative bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-primary/60 p-2.5 rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-md hover:shadow-primary/10 cursor-pointer"
                    >
                      <div className="space-y-2">
                        <GiftImageCarousel
                          images={gift.images}
                          fallbackImage={gift.image}
                          name={gift.name}
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                            {gift.name}
                          </h4>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-white/40 line-through">
                                {formatNaira(gift.price || 0)}
                              </span>
                              <span className="text-xs font-black text-emerald-400">FREE</span>
                            </div>
                            {gift.stock <= 5 && (
                              <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 px-1 rounded">
                                {gift.stock} left
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(gift);
                        }}
                        className="mt-2.5 w-full py-1.5 bg-primary/20 hover:bg-primary border border-primary/40 hover:border-primary text-primary hover:text-black rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all duration-200"
                      >
                        <span>View Details</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!viewingDetailGift && (
              <div className="pt-2 border-t border-white/10 text-center flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseGiftModal}
                  className="text-xs text-white/50 hover:text-white transition-colors"
                >
                  Cancel / Choose later
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CartDrawer;