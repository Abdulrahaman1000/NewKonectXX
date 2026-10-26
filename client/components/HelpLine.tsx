/**
 * "Not sure how to go about it?" line for bulk, pre-order and split-delivery notices.
 * Two plain buttons: the AI chat, and a person on WhatsApp. Both work inside the Android app (no pop-up tricks).
 */
import { MessageCircle, Sparkles } from 'lucide-react';
import { chatUI } from '@/stores/chat';
import { useSettings } from '@/contexts/SettingsContext';

export function HelpLine({ topic = 'my order', className = '' }: { topic?: string; className?: string }) {
  const { settings } = useSettings();
  const base = settings?.contact?.whatsappLink ?? '';
  const waUrl = base
    ? `${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent(`Hello Smart Combo, I need help with ${topic}.`)}`
    : '';

  return (
    <div className={`rounded-xl border border-white/10 bg-black/20 p-3 ${className}`} data-testid="help-line">
      <p className="text-[13px] font-bold text-white">Not sure how to go about it?</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">
        Ask our AI chat, or talk to a person at our customer service.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => chatUI.open()}
          className="min-h-[44px] flex-1 basis-40 rounded-lg border border-primary/40 px-3 text-[13px] font-bold text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Ask our AI chat
        </button>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] flex-1 basis-40 rounded-lg border border-white/15 px-3 text-[13px] font-bold text-white/85 hover:bg-white/5 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Talk to a person
          </a>
        )}
      </div>
    </div>
  );
}
