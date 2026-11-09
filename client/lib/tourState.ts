/** SC-TOUR  Small shared switch so the welcome tour and the welcome offers popup never show together. */
import { useSyncExternalStore } from 'react';
let open = false;
const subs = new Set<() => void>();
export const setTourOpen = (v: boolean) => { open = v; subs.forEach((f) => f()); };
export const openTour = () => window.dispatchEvent(new Event('sc-open-tour'));
export function useTourOpen() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => open, () => false);
}
