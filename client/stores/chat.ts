/**
 * Tiny open/close state for the chat screen (no extra libraries).
 * Usage: chatUI.open() from anywhere; useChatOpen() to read it in a component.
 */

import { useSyncExternalStore } from 'react';

export type ChatTab = 'ai' | 'human';

let isOpen = false;
let chatTab: ChatTab = 'ai';
let seq = 0; // goes up on every open(), so an already-open panel can switch tab
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const chatUI = {
  /** chatUI.open() = AI tab (as before). chatUI.open('human') = customer service tab. */
  open(tab: ChatTab = 'ai') {
    chatTab = tab;
    seq += 1;
    isOpen = true;
    emit();
  },
  tab(): ChatTab {
    return chatTab;
  },
  close() {
    isOpen = false;
    emit();
  },
};

export function useChatSeq(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => seq,
    () => 0,
  );
}

export function useChatOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => isOpen,
    () => false,
  );
}
