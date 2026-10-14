/**
 * In-app confirm / prompt dialogs that match the site, replacing the browser's
 * "localhost:8081 says" popups.  Destination: client/components/shared/ConfirmProvider.tsx
 *
 *   const { confirm, ask } = useDialogs();
 *   if (await confirm({ title: 'Delete this ad?', message: 'This cannot be undone.', danger: true })) { ... }
 *   const reason = await ask({ title: 'Decline', label: 'Reason' });   // null when cancelled
 *
 * <ConfirmProvider> must wrap the app once (done in App.tsx).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button, for deletes */
  danger?: boolean;
}
interface AskOptions extends ConfirmOptions {
  label?: string;
  placeholder?: string;
  initial?: string;
}

interface Pending {
  kind: 'confirm' | 'ask';
  opts: AskOptions;
  resolve: (v: boolean | string | null) => void;
}

interface Dialogs {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  ask: (o: AskOptions) => Promise<string | null>;
}

const Ctx = createContext<Dialogs | null>(null);

export function useDialogs(): Dialogs {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDialogs must be used inside <ConfirmProvider>');
  return v;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [text, setText] = useState('');
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ kind: 'confirm', opts, resolve: (v) => resolve(v === true) })),
    [],
  );
  const ask = useCallback(
    (opts: AskOptions) =>
      new Promise<string | null>((resolve) => {
        setText(opts.initial ?? '');
        setPending({ kind: 'ask', opts, resolve: (v) => resolve(typeof v === 'string' ? v : null) });
      }),
    [],
  );

  const close = (result: boolean | string | null) => {
    pending?.resolve(result);
    setPending(null);
  };

  useEffect(() => {
    if (!pending) return;
    (pending.kind === 'ask' ? input.current : confirmBtn.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { pending.resolve(pending.kind === 'ask' ? null : false); setPending(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const o = pending?.opts;

  return (
    <Ctx.Provider value={{ confirm, ask }}>
      {children}
      {pending && o && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => close(pending.kind === 'ask' ? null : false)}
          role="dialog"
          aria-modal="true"
          aria-label={o.title}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-white">{o.title}</h2>
            {o.message && <div className="mt-2 text-sm text-white/60 whitespace-pre-line">{o.message}</div>}

            {pending.kind === 'ask' && (
              <div className="mt-3">
                {o.label && <label className="mb-1 block text-xs font-semibold text-white/50">{o.label}</label>}
                <textarea
                  ref={input}
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={o.placeholder}
                  maxLength={500}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-primary/50"
                />
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => close(pending.kind === 'ask' ? null : false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:text-white"
              >
                {o.cancelText ?? 'Cancel'}
              </button>
              <button
                ref={confirmBtn}
                onClick={() => close(pending.kind === 'ask' ? text.trim() : true)}
                className={
                  o.danger
                    ? 'rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600'
                    : 'btn-primary px-4 py-2 text-sm font-bold'
                }
              >
                {o.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
