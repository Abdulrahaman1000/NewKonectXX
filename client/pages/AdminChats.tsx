/**
 * Admin Chats — /admin/chats
 * Inbox on the left, conversation on the right (stacked on phones).
 * Refreshes by itself every few seconds while this page is open.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { SEO } from '@/components/shared/SEO';
import { deleteChat, getChat, listChats, replyToChat } from '@/api/adminChats';
import { toast } from 'sonner';
import { useDialogs } from '@/components/shared/ConfirmProvider';

const when = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export default function AdminChats() {
  const queryClient = useQueryClient();
  const { confirm } = useDialogs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['admin-chats'],
    queryFn: listChats,
    refetchInterval: 5000,
  });

  const { data: convo } = useQuery({
    queryKey: ['admin-chat', selectedId],
    queryFn: () => getChat(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 3000,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-chat'] });
    queryClient.invalidateQueries({ queryKey: ['admin-chat-unread'] });
  };

  const replyMut = useMutation({
    mutationFn: (t: string) => replyToChat(selectedId!, t),
    onSuccess: () => {
      setText('');
      refreshAll();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to send'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteChat(id),
    onSuccess: () => {
      toast.success('Chat deleted');
      setSelectedId(null);
      refreshAll();
    },
    onError: () => toast.error('Failed to delete'),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo?.messages.length, selectedId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !selectedId || replyMut.isPending) return;
    replyMut.mutate(t);
  };

  return (
    <AdminFrame>
      <SEO title="Chats — Admin" />

      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-primary mb-4">
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white">Chats</h1>
        <p className="text-white/50 text-sm mt-1">Messages from customers. This page updates by itself.</p>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        {/* Inbox */}
        <div className={`${selectedId ? 'hidden md:block' : ''} rounded-2xl border border-white/10 overflow-hidden`}>
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : chats.length === 0 ? (
            <p className="py-16 px-6 text-center text-sm text-white/40">No chats yet.</p>
          ) : (
            <ul className="divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
              {chats.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 ${
                      selectedId === c.id ? 'bg-white/5' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center text-sm font-black shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${c.unreadForAdmin ? 'font-black text-white' : 'font-semibold text-white/80'}`}>
                          {c.name}
                        </p>
                        <span className="text-[10px] text-white/35 shrink-0">{when(c.lastMessageAt)}</span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${c.unreadForAdmin ? 'text-white/80' : 'text-white/40'}`}>
                        {c.lastMessagePreview}
                      </p>
                    </div>
                    {c.unreadForAdmin > 0 && (
                      <span className="mt-1 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-black text-[11px] font-black flex items-center justify-center">
                        {c.unreadForAdmin}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conversation */}
        <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-col rounded-2xl border border-white/10 overflow-hidden min-h-[60vh]`}>
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 py-20">
              <MessageCircle className="w-10 h-10 mb-3" />
              <p className="text-sm">Select a chat to read and reply</p>
            </div>
          ) : !convo ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="md:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10"
                  aria-label="Back to inbox"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{convo.name}</p>
                  <p className="text-[11px] text-white/45">
                    {convo.phone ? (
                      <a href={`tel:${convo.phone}`} className="text-primary hover:underline">{convo.phone}</a>
                    ) : (
                      'No phone given'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Delete chat',
                      message: `Delete the chat with ${convo.name}? This can't be undone.`,
                      confirmText: 'Delete',
                      danger: true,
                    });
                    if (ok) deleteMut.mutate(convo.id);
                  }}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 max-h-[55vh] min-h-[40vh]">
                {convo.messages.map((m) => {
                  const mine = m.sender === 'admin';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                          mine ? 'bg-primary text-black rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm leading-snug whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={`text-[10px] mt-1 text-right ${mine ? 'text-black/55' : 'text-white/40'}`}>
                          {when(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={submit} className="flex items-center gap-2 p-3 border-t border-white/10">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  placeholder="Type your reply"
                  className="flex-1 min-w-0 h-11 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary/60"
                />
                <button
                  type="submit"
                  disabled={replyMut.isPending || !text.trim()}
                  aria-label="Send reply"
                  className="w-11 h-11 shrink-0 rounded-full bg-primary text-black flex items-center justify-center disabled:opacity-50"
                >
                  {replyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AdminFrame>
  );
}
