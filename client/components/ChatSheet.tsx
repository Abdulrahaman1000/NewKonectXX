/**
 * ChatSheet — full-screen customer chat for phones. No login needed.
 *
 * First time: a short form (name, optional phone, first message).
 * After that: a normal chat. New replies are fetched every 4 seconds while it's open.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { ApiError } from '@/api/client';
import {
  ChatMessage,
  clearChatToken,
  fetchChat,
  getChatToken,
  saveChatToken,
  sendChatMessage,
  startChat,
} from '@/api/chat';
import { chatUI, useChatOpen } from '@/stores/chat';

const QUICK = ['Is this available?', 'How long is delivery?', 'Can I get a discount?'];

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function ChatSheet() {
  const isOpen = useChatOpen();
  return isOpen ? <ChatPanel /> : null;
}

function ChatPanel() {
  const { settings } = useSettings();
  const [token, setToken] = useState<string | null>(getChatToken());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(!!getChatToken());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [text, setText] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const whatsappLink = settings?.contact?.whatsappLink || '';

  // Stop the page behind from scrolling while the chat is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const load = useCallback(async (t: string) => {
    try {
      setMessages(await fetchChat(t));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // The chat was removed on the server: start fresh
        clearChatToken();
        setToken(null);
        setMessages([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    load(token);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load(token);
    }, 4000);
    return () => clearInterval(id);
  }, [token, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const begin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !firstMessage.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const r = await startChat({
        name: name.trim(),
        phone: phone.trim() || undefined,
        message: firstMessage.trim(),
      });
      saveChatToken(r.token);
      setToken(r.token);
      setMessages(r.messages);
    } catch (err: any) {
      setError(err?.message || 'Could not start the chat. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !token || sending) return;
    setSending(true);
    setError('');
    try {
      await sendChatMessage(token, t);
      setText('');
      await load(token);
    } catch (err: any) {
      setError(err?.message || 'Message not sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] flex flex-col bg-background text-foreground"
      style={{ height: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label="Chat"
    >
      {/* Header */}
      <header
        className="shrink-0 flex items-center gap-3 px-3 pb-2 border-b border-white/10 bg-background"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
      >
        <button
          type="button"
          onClick={chatUI.close}
          aria-label="Close chat"
          className="w-11 h-11 -ml-1 flex items-center justify-center rounded-full text-white/80 active:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shrink-0">
          <span className="text-black font-black text-xs">SC</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">Smart Combo support</p>
          <p className="text-[11px] text-emerald-300 leading-tight">We usually reply within minutes</p>
        </div>
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-semibold text-emerald-300 border border-emerald-400/40 rounded-full px-3 h-9 flex items-center active:bg-emerald-400/10"
          >
            WhatsApp
          </a>
        )}
      </header>

      {/* Body */}
      {!token ? (
        <form onSubmit={begin} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          <div>
            <h2 className="text-xl font-black text-white">Chat with us</h2>
            <p className="text-sm text-white/55 mt-1">
              Ask about a product, delivery, or your order. No account needed.
            </p>
          </div>

          <label className="block">
            <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
              Your name *
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="name"
              className="w-full h-12 rounded-xl border border-white/15 bg-transparent px-3.5 text-base text-white placeholder:text-white/35 outline-none focus:border-primary/60"
              placeholder="e.g. Ade"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
              Phone (optional)
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              inputMode="tel"
              autoComplete="tel"
              className="w-full h-12 rounded-xl border border-white/15 bg-transparent px-3.5 text-base text-white placeholder:text-white/35 outline-none focus:border-primary/60"
              placeholder="So we can call you back"
            />
          </label>

          <div>
            <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
              Your message *
            </span>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setFirstMessage(q)}
                  className="px-3 h-9 rounded-full border border-emerald-400/50 text-emerald-300 text-sm active:bg-emerald-400/10"
                >
                  {q}
                </button>
              ))}
            </div>
            <textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              maxLength={1000}
              rows={4}
              className="w-full rounded-xl border border-white/15 bg-transparent px-3.5 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-primary/60"
              placeholder="Type your message here"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={sending || !name.trim() || !firstMessage.trim()}
            className="btn-primary w-full h-12 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Start chat
          </button>
        </form>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5">
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender === 'customer';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                        mine
                          ? 'bg-primary text-black rounded-br-md'
                          : 'bg-white/10 text-white rounded-bl-md'
                      }`}
                    >
                      <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={`text-[10px] mt-1 text-right ${mine ? 'text-black/55' : 'text-white/40'}`}>
                        {timeOf(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="px-4 pb-1 text-xs text-red-300">{error}</p>}

          <form
            onSubmit={send}
            className="shrink-0 flex items-center gap-2 px-3 pt-2 border-t border-white/10 bg-background"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              enterKeyHint="send"
              placeholder="Type a message"
              className="flex-1 min-w-0 h-12 rounded-full border border-white/15 bg-white/5 px-4 text-base text-white placeholder:text-white/35 outline-none focus:border-primary/60"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send"
              className="w-12 h-12 shrink-0 rounded-full bg-primary text-black flex items-center justify-center active:scale-95 transition disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
