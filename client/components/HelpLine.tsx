/**
 * "Not sure how to go about it?" line for bulk, pre-order and split-delivery notices.
 * Two buttons, both open the site's own chat (no WhatsApp, no pop-ups, so it works in the Android app):
 *  - "Ask our AI chat"      -> chat opens on the AI tab
 *  - "Talk to a person"     -> chat opens on the customer service tab ("Talk to us")
 */
import { MessageCircle, Sparkles } from 'lucide-react';
import { chatUI } from '@/stores/chat';

export function HelpLine({ className = '' }: { topic?: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-black/20 p-3 ${className}`} data-testid="help-line">
      <p className="text-[13px] font-bold text-white">Not sure how to go about it?</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">
        Ask our AI chat, or talk to a person at our customer service.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => chatUI.open('ai')}
          className="min-h-[44px] flex-1 basis-40 rounded-lg border border-primary/40 px-3 text-[13px] font-bold text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Ask our AI chat
        </button>
        <button
          type="button"
          onClick={() => chatUI.open('human')}
          className="min-h-[44px] flex-1 basis-40 rounded-lg border border-white/15 px-3 text-[13px] font-bold text-white/85 hover:bg-white/5 flex items-center justify-center gap-2"
          data-testid="help-line-person"
        >
          <MessageCircle className="w-4 h-4" /> Talk to a person
        </button>
      </div>
    </div>
  );
}
