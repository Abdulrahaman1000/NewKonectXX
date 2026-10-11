/**
 * Tiny open/close state for the chat screen (no extra libraries).
 * Usage: chatUI.open() from anywhere; useChatOpen() to read it in a component.
 */

import { useSyncExternalStore } from 'react';

let isOpen = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const chatUI = {
  open() {
    isOpen = true;
    emit();
  },
  close() {
    isOpen = false;
    emit();
  },
};

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