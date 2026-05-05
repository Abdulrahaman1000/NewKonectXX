import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductImage } from '@/types/combo';

interface Props {
  images: ProductImage[];
  productName: string;
  autoRotateMs?: number;       // default 3000
  manualPauseMs?: number;      // pause auto-rotate after manual click
}

export function ProductImageSlider({
  images,
  productName,
  autoRotateMs = 3000,
  manualPauseMs = 6000,
}: Props) {
  const [idx, setIdx] = useState(0);
  const manualPauseUntil = useRef(0);
  const total = images.length;

  // Auto-rotate
  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < manualPauseUntil.current) return;
      setIdx((p) => (p + 1) % total);
    }, autoRotateMs);
    return () => clearInterval(id);
  }, [total, autoRotateMs]);

  const goTo = (next: number) => {
    manualPauseUntil.current = Date.now() + manualPauseMs;
    setIdx(((next % total) + total) % total);
  };

  if (total === 0) return null;

  return (
    <div
      className="group relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/8 bg-black/30 cursor-pointer"
      onClick={() => goTo(idx + 1)}
      role="button"
      tabIndex={0}
      aria-label={`${productName} image gallery — image ${idx + 1} of ${total}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') goTo(idx - 1);
        if (e.key === 'ArrowRight') goTo(idx + 1);
      }}
    >
      {images.map((img, i) => (
        <img
          key={i}
          src={img.url}
          alt={img.alt ?? `${productName} — image ${i + 1}`}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
          style={{
            opacity: i === idx ? 1 : 0,
            transform: i === idx ? 'scale(1)' : 'scale(1.04)',
          }}
        />
      ))}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goTo(idx - 1);
            }}
            aria-label="Previous image"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-primary/70 border border-white/10 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goTo(idx + 1);
            }}
            aria-label="Next image"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-primary/70 border border-white/10 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, dotI) => (
              <button
                key={dotI}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(dotI);
                }}
                aria-label={`Go to image ${dotI + 1}`}
                className={`rounded-full transition-all duration-500 ${
                  dotI === idx
                    ? 'w-5 h-[3px] bg-primary shadow-[0_0_8px_rgba(255,215,0,0.9)]'
                    : 'w-[5px] h-[5px] bg-white/35 hover:bg-white/65'
                }`}
              />
            ))}
          </div>

          <div className="absolute top-3 right-3 text-[10px] text-white/45 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
            {idx + 1}/{total}
          </div>
        </>
      )}
    </div>
  );
}
