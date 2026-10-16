/**
 * ChatSheet — customer chat. Phones: full screen. Desktop: floating panel.
 *
 * Two tabs:
 *  - "Ask AI": answers from the shop's real products, prices and rules, with sources.
 *  - "Talk to us": the existing human chat (name, optional phone, message), unchanged.
 *
 * If the AI can't help it offers a one-tap handoff to the human chat or WhatsApp.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { ApiError } from '@/api/client';
import { askAI, AISource } from '@/api/ai';
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
const AI_STARTERS = [
  'What can I buy within ₦50,000?',
  'How does the combo offer work?',
  'How do I get the free gift?',
  'What is your delivery fee?',
];
const AI_KEY = 'smartcombo:aiChat';
const MAX_KEPT = 30;

interface AIMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: AISource[];
  needsHuman?: boolean;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function loadAI(): AIMsg[] {
  try {
    const raw = JSON.parse(localStorage.getItem(AI_KEY) || '[]');
    return Array.isArray(raw) ? raw.slice(-MAX_KEPT) : [];
  } catch {
    return [];
  }
}
function saveAI(m: AIMsg[]) {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(m.slice(-MAX_KEPT)));
  } catch {
    /* private mode: chat still works for this visit */
  }
}

export function ChatSheet() {
  const isOpen = useChatOpen();
  return isOpen ? <ChatPanel /> : null;
}

function ChatPanel() {
  const { settings } = useSettings();
  const [tab, setTab] = useState<'ai' | 'human'>('ai');
  const [handoff, setHandoff] = useState('');

  const waNumber = settings?.contact?.whatsappNumber?.replace(/\D/g, '') ?? '';
  const whatsappLink = settings?.contact?.whatsappLink || (waNumber ? `https://wa.me/${waNumber}` : '');

  // Phones only: stop the page behind from scrolling while the chat is full screen
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape closes the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && chatUI.close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toHuman = (question?: string) => {
    setHandoff(question ? question.slice(0, 300) : '');
    setTab('human');
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] flex h-[100dvh] flex-col bg-background text-foreground md:inset-x-auto md:top-auto md:bottom-24 md:right-6 md:h-[640px] md:max-h-[calc(100dvh-8rem)] md:w-[400px] md:overflow-hidden md:rounded-2xl md:border md:border-border md:shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Chat"
    >
      {/* Header */}
      <header
        className="shrink-0 flex items-center gap-3 px-3 pb-2 border-b border-border bg-background"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
      >
        <button
          type="button"
          onClick={chatUI.close}
          aria-label="Close chat"
          className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full text-foreground/80 active:bg-foreground/10 hover:bg-foreground/5"
        >
          <ArrowLeft className="w-5 h-5 md:hidden" />
          <X className="w-5 h-5 hidden md:block" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Smart Combo Assistant</p>
          <p className="text-[11px] text-muted-foreground leading-tight truncate">
            Answers from our real products and prices
          </p>
        </div>
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-semibold text-emerald-500 border border-emerald-500/40 rounded-full px-3 h-9 flex items-center hover:bg-emerald-500/10"
          >
            WhatsApp
          </a>
        )}
      </header>

      {/* Tabs */}
      <div className="shrink-0 grid grid-cols-2 gap-1 p-2 border-b border-border bg-background">
        {(
          [
            ['ai', 'Ask AI', Sparkles],
            ['human', 'Talk to us', MessageCircle],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-foreground/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'ai' ? (
        <AIChat onHuman={toHuman} whatsappLink={whatsappLink} />
      ) : (
        <HumanChat prefill={handoff} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI tab                                                              */
/* ------------------------------------------------------------------ */

function AIChat({ onHuman, whatsappLink }: { onHuman: (q?: string) => void; whatsappLink: string }) {
  const [messages, setMessages] = useState<AIMsg[]>(loadAI);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveAI(messages), [messages]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy, error]);
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
  }, []);

  const lastQuestion = [...messages].reverse().find((m) => m.role === 'user')?.text;

  const ask = useCallback(
    async (question: string, base: AIMsg[]) => {
      const next = [...base, { id: uid(), role: 'user' as const, text: question }];
      setMessages(next);
      setBusy(true);
      setError('');
      try {
        const turns = next.slice(-10).map((m) => ({ role: m.role, text: m.text }));
        const r = await askAI(turns);
        setMessages((cur) => [
          ...cur,
          { id: uid(), role: 'assistant', text: r.answer, sources: r.sources, needsHuman: r.needsHuman },
        ]);
      } catch (err) {
        const msg =
          err instanceof ApiError && err.status === 429
            ? err.message
            : "Our assistant isn't available right now. You can talk to our team instead.";
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    setText('');
    void ask(q, messages);
  };

  const retry = () => {
    if (!lastQuestion || busy) return;
    // drop the unanswered last question, then ask it again
    const base = messages.slice(0, messages.length - 1);
    void ask(lastQuestion, base);
  };

  const close = () => {
    if (window.innerWidth < 768) chatUI.close();
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="pt-2">
            <div className="rounded-2xl bg-muted p-4">
              <p className="font-bold">Hi, I'm the Smart Combo assistant 👋</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ask me about our combos, prices, free gifts or delivery. I only answer from what's
                really in our shop.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {AI_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s, messages)}
                  className="px-3 py-2 rounded-full border border-primary/40 text-sm text-primary text-left hover:bg-primary/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const mine = m.role === 'user';
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  mine
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{m.text}</p>
              </div>

              {!mine && m.sources && m.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 max-w-[92%]">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Source</span>
                  {m.sources.map((s) =>
                    s.link ? (
                      <Link
                        key={s.id}
                        to={s.link}
                        onClick={close}
                        className="text-xs px-2.5 py-1 rounded-full border border-border text-foreground/80 hover:border-primary hover:text-primary truncate max-w-[200px]"
                      >
                        {s.title}
                      </Link>
                    ) : (
                      <span
                        key={s.id}
                        className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground truncate max-w-[200px]"
                      >
                        {s.title}
                      </span>
                    ),
                  )}
                </div>
              )}

              {!mine && m.needsHuman && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onHuman(lastQuestion)}
                    className="px-3 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    Talk to a person
                  </button>
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 h-9 rounded-full border border-emerald-500/50 text-emerald-500 text-sm font-semibold flex items-center"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3 flex gap-1" aria-label="Assistant is typing">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm">{error}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={retry}
                className="px-3 h-9 rounded-full border border-border text-sm font-semibold hover:bg-foreground/5"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => onHuman(lastQuestion)}
                className="px-3 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
              >
                Talk to a person
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border bg-background">
        {messages.length > 0 && (
          <div className="px-4 pt-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError('');
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline"
            >
              Clear chat
            </button>
          </div>
        )}
        <form
          onSubmit={submit}
          className="flex items-center gap-2 px-3 pt-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            enterKeyHint="send"
            placeholder="Ask about a product, price or delivery"
            className="flex-1 min-w-0 h-12 rounded-full border border-border bg-muted/50 px-4 text-base placeholder:text-muted-foreground outline-none focus:border-primary/60"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Send"
            className="w-12 h-12 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <p
          className="px-4 pb-2 text-[10px] text-muted-foreground text-center"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
        >
          AI can make mistakes. Always confirm the final price at checkout.
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Human chat tab (the original chat, same behaviour)                  */
/* ------------------------------------------------------------------ */

function HumanChat({ prefill }: { prefill: string }) {
  const [token, setToken] = useState<string | null>(getChatToken());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(!!getChatToken());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [firstMessage, setFirstMessage] = useState(prefill);
  const [text, setText] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);

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

  if (!token) {
    return (
      <form onSubmit={begin} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div>
          <h2 className="text-xl font-black">Talk to our team</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A real person will reply here. No account needed.
          </p>
        </div>

        <label className="block">
          <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Your name *
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete="name"
            className="w-full h-12 rounded-xl border border-border bg-transparent px-3.5 text-base placeholder:text-muted-foreground outline-none focus:border-primary/60"
            placeholder="e.g. Ade"
          />
        </label>

        <label className="block">
          <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Phone (optional)
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            inputMode="tel"
            autoComplete="tel"
            className="w-full h-12 rounded-xl border border-border bg-transparent px-3.5 text-base placeholder:text-muted-foreground outline-none focus:border-primary/60"
            placeholder="So we can call you back"
          />
        </label>

        <div>
          <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Your message *
          </span>
          <div className="flex flex-wrap gap-2 mb-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setFirstMessage(q)}
                className="px-3 h-9 rounded-full border border-emerald-500/50 text-emerald-500 text-sm hover:bg-emerald-500/10"
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
            className="w-full rounded-xl border border-border bg-transparent px-3.5 py-3 text-base placeholder:text-muted-foreground outline-none focus:border-primary/60"
            placeholder="Type your message here"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={sending || !name.trim() || !firstMessage.trim()}
          className="btn-primary w-full h-12 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Start chat
        </button>
      </form>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender === 'customer';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    mine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${mine ? 'opacity-60' : 'text-muted-foreground'}`}>
                    {timeOf(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}

      <form
        onSubmit={send}
        className="shrink-0 flex items-center gap-2 px-3 pt-2 border-t border-border bg-background"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          enterKeyHint="send"
          placeholder="Type a message"
          className="flex-1 min-w-0 h-12 rounded-full border border-border bg-muted/50 px-4 text-base placeholder:text-muted-foreground outline-none focus:border-primary/60"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Send"
          className="w-12 h-12 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </>
  );
}
