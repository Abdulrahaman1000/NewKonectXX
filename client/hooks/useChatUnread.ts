import { useEffect, useState } from 'react';
import { fetchChatUnread, getChatToken } from '@/api/chat';

/**
 * Number of unread admin replies for this browser's chat.
 * Checks every 30s while `enabled` (pass false while the chat screen is open).
 */
export function useChatUnread(enabled: boolean): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setUnread(0);
      return;
    }
    let stopped = false;
    const check = async () => {
      const token = getChatToken();
      if (!token) {
        setUnread(0);
        return;
      }
      try {
        const n = await fetchChatUnread(token);
        if (!stopped) setUnread(n);
      } catch {
        /* ignore: offline or chat deleted */
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [enabled]);

  return unread;
}
