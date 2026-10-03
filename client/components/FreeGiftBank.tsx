'use client';

import React, { useState } from 'react';
import { useCart } from '@/stores/cart';
import type { Combo } from '@/types/combo';
import { Gift, Check, ChevronRight, Sparkles, X, ArrowLeft, ZoomIn } from 'lucide-react';

interface FreeGiftBankProps {
  giftCandidates: Combo[];
}

export const FreeGiftBank: React.FC<FreeGiftBankProps> = ({ giftCandidates }) => {
  const { subtotal, qualifiesForFreeGift, selectFreeGift, selectedFreeGift, removeFreeGift } = useCart();
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  
  // Selected gift state for claiming
  const [selectedCandidate, setSelectedCandidate] = useState<Combo | null>(null);
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});

  // DETAILED VIEW STATE (Inside Modal)
  const [viewingDetailGift, setViewingDetailGift] = useState<Combo | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const currentGift = selectedFreeGift();
  const currentSubtotal = subtotal();
  const isQualified = qualifiesForFreeGift();
  const threshold = 40000;
  const remainingForGift = Math.max(0, threshold - currentSubtotal);
  const progressPercent = Math.min(100, Math.round((currentSubtotal / threshold) * 100));

  const openGiftModal = () => {
    setModalOpen(true);
    setViewingDetailGift(null);
    if (giftCandidates.length > 0 && !selectedCandidate) {
      handleSelectCandidate(giftCandidates[0]);
    }
  };

  const handleSelectCandidate = (combo: Combo) => {
    setSelectedCandidate(combo);
    const defaults: Record<string, string> = {};
    (combo.items || []).forEach((item) => {
      if (item.id && item.alternatives && item.alternatives.length > 0) {
        defaults[item.id] = item.alternatives[0].id;
      }
    });
    setVariantSelections(defaults);
  };

  // Triggers when user clicks an image inside the modal grid
  const handleOpenDetail = (gift: Combo, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectCandidate(gift);
    setViewingDetailGift(gift);
    setActiveImageIndex(0);
  };

  const handleClaimGift = () => {
    if (!selectedCandidate) return;
    selectFreeGift(selectedCandidate, variantSelections);
    setModalOpen(false);
    setViewingDetailGift(null);
  };

  // Helper to extract all images from nested combo items
  const getAllGiftImages = (gift: Combo): string[] => {
    const urls: string[] = [];
    (gift.items || []).forEach((item) => {
      (item.images || []).forEach((img) => {
        if (img?.url) urls.push(img.url);
      });
    });
    return urls.length > 0 ? urls : ['/placeholder.png'];
  };

  if (currentSubtotal <= 0) return null;

  return (
    <div className="w-full my-4">
      {/* Below Threshold Banner */}
      {!isQualified && (
        <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-2">
            <div className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Unlock a Free Gift!</span>
            </div>
            <span className="text-amber-400 font-bold">
              Add ₦{remainingForGift.toLocaleString()} more
            </span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-white/50 mt-2">
            Orders ₦40,000+ qualify for a free luxury gift item.
          </p>
        </div>
      )}

      {/* Qualified Unlocked Banner */}
      {isQualified && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                  FREE GIFT UNLOCKED!
                </h4>
                <p className="text-xs text-emerald-400 font-medium">
                  {currentGift ? `Claimed: ${currentGift.comboName}` : 'Choose 1 gift for your order'}
                </p>
              </div>
            </div>

            {currentGift ? (
              <button
                type="button"
                onClick={removeFreeGift}
                className="text-xs text-red-400 hover:text-red-300 font-medium underline px-2 py-1 cursor-pointer"
              >
                Change Gift
              </button>
            ) : (
              <button
                type="button"
                onClick={openGiftModal}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Select Gift</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* POPUP MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 text-white rounded-2xl max-w-md w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg bg-white/5 z-20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* SCREEN 2: FULL DETAIL PAGE INSIDE MODAL */}
            {viewingDetailGift ? (
              <div className="space-y-4 pt-1">
                <button
                  type="button"
                  onClick={() => setViewingDetailGift(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to All Gifts
                </button>

                <h3 className="text-base font-bold text-white">{viewingDetailGift.name}</h3>

                {/* Main Detailed Image */}
                {(() => {
                  const images = getAllGiftImages(viewingDetailGift);
                  return (
                    <div className="space-y-2">
                      <div className="w-full h-60 rounded-xl overflow-hidden bg-black/60 border border-white/10 relative">
                        <img
                          src={images[activeImageIndex]}
                          alt={viewingDetailGift.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Thumbnail Strip for Multi-Image Preview */}
                      {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {images.map((imgUrl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveImageIndex(idx)}
                              className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-pointer transition-all ${
                                idx === activeImageIndex
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 opacity-100 scale-105'
                                  : 'border-white/10 opacity-50 hover:opacity-100'
                              }`}
                            >
                              <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Gift Description */}
                {viewingDetailGift.description && (
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs text-white/70 leading-relaxed">
                    <span className="font-bold text-white block mb-1">Details:</span>
                    {viewingDetailGift.description}
                  </div>
                )}

                {/* Variant Options inside detail page */}
                {(viewingDetailGift.items || []).map((slot) => {
                  if (!slot.alternatives || slot.alternatives.length === 0) return null;
                  return (
                    <div key={slot.id} className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/70 block">
                        Choose {slot.name}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {slot.alternatives.map((alt) => {
                          const isSelected = variantSelections[slot.id] === alt.id;
                          return (
                            <button
                              key={alt.id}
                              type="button"
                              onClick={() =>
                                setVariantSelections((prev) => ({
                                  ...prev,
                                  [slot.id]: alt.id,
                                }))
                              }
                              className={`px-2.5 py-2 text-xs rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                                  : 'border-white/10 text-white/70 hover:border-white/20'
                              }`}
                            >
                              <span className="truncate">{alt.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleClaimGift}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Claim This Free Gift</span>
                </button>
              </div>
            ) : (
              /* SCREEN 1: GIFT LIST SELECTION */
              <>
                <h3 className="text-base font-bold text-white mb-1">Choose Your Free Gift</h3>
                <p className="text-xs text-white/50 mb-4">
                  Tap any image to open full details and photo gallery.
                </p>

                {giftCandidates.length === 0 ? (
                  <div className="py-8 text-center text-white/40 text-sm">
                    No free gift items available right now.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {giftCandidates.map((gift) => {
                        const isSelected = selectedCandidate?.id === gift.id;
                        const mainImg = gift.items?.[0]?.images?.[0]?.url || '/placeholder.png';

                        return (
                          <div
                            key={gift.id}
                            onClick={() => handleSelectCandidate(gift)}
                            className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            {/* CLICKABLE IMAGE CONTAINER */}
                            <div
                              onClick={(e) => handleOpenDetail(gift, e)}
                              className="relative w-full h-28 rounded-lg overflow-hidden mb-2 bg-black/40 group cursor-pointer"
                            >
                              <img
                                src={mainImg}
                                alt={gift.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-emerald-500 text-black text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                                  <ZoomIn className="w-3 h-3" /> View Details
                                </span>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-bold truncate text-white mb-1">{gift.name}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-emerald-400">FREE</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenDetail(gift, e)}
                                  className="text-[10px] text-emerald-400 font-bold hover:underline cursor-pointer"
                                >
                                  Details &rarr;
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleClaimGift}
                      disabled={!selectedCandidate}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Claim Free Gift</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};