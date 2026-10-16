/**
 * AIProductCards — neat product cards shown under an AI answer.
 * Uses the same colours and text sizes as the rest of the chat.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import type { AICard } from '@/api/ai';

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

function Photo({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
        <ShoppingBag className="w-7 h-7" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}

const clamp2: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

export function AIProductCards({
  cards,
  onNavigate,
}: {
  cards: AICard[];
  onNavigate?: () => void;
}) {
  if (!cards.length) return null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-2 w-full max-w-[92%]">
      {cards.map((c) => {
        const body = (
          <>
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-background">
              <Photo src={c.image} alt={c.title} />
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug break-words" style={clamp2}>
              {c.title}
            </p>
            <p className="text-sm font-bold text-primary">{naira(c.price)}</p>
            {!c.inStock && <p className="text-xs text-muted-foreground">Out of stock</p>}
          </>
        );
        const cls =
          'block min-w-0 rounded-2xl border border-border bg-muted p-2 text-left transition-colors';
        return c.link ? (
          <Link key={c.id} to={c.link} onClick={onNavigate} className={`${cls} hover:border-primary`}>
            {body}
          </Link>
        ) : (
          <div key={c.id} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
