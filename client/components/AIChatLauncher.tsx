/**
 * AIChatLauncher — desktop floating button that replaces the WhatsApp float.
 * Opens the same chat panel the phone uses (AI + talk-to-us). WhatsApp is still
 * one tap away inside the panel. Phones use the bottom-nav "Chat" tab instead.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { ChatSheet } from '@/components/ChatSheet';
import { chatUI, useChatOpen } from '@/stores/chat';
import { useMobileLayout } from '@/hooks/useMobileLayout';

export function AIChatLauncher() {
  const isMobile = useMobileLayout();
  const { pathname } = useLocation();
  const open = useChatOpen();
  const [visible, setVisible] = useState(false);
  const [tipSeen, setTipSeen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (isMobile || pathname.startsWith('/admin')) return null;

  const toggle = () => {
    setTipSeen(true);
    if (open) chatUI.close();
    else chatUI.open();
  };

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-[60] transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {!open && !tipSeen && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground shadow-lg">
              Ask our AI assistant
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-y-[5px] border-l-[6px] border-y-transparent border-l-border" />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={toggle}
          aria-label={open ? 'Close chat' : 'Open chat assistant'}
          aria-expanded={open}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 text-primary-foreground shadow-2xl transition-transform hover:scale-110 active:scale-95"
          style={{ boxShadow: '0 8px 32px hsl(var(--primary) / 0.45)' }}
        >
          {!open && (
            <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping [animation-duration:2.5s]" />
          )}
          {open ? <X className="relative h-6 w-6" /> : <Sparkles className="relative h-6 w-6" />}
        </button>
      </div>

      <ChatSheet />
    </>
  );
}
