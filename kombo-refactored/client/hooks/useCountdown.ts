import { useEffect, useState } from 'react';

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  hasEnded: boolean;
}

const ZERO: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, hasEnded: true };

const compute = (target: number): TimeLeft => {
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return ZERO;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    totalMs: diff,
    hasEnded: false,
  };
};

/**
 * Counts down to an ISO date string or epoch ms.
 * Pass null/undefined to get a paused zero.
 */
export function useCountdown(target: string | number | null | undefined): TimeLeft {
  const [time, setTime] = useState<TimeLeft>(() => {
    if (!target) return ZERO;
    return compute(typeof target === 'string' ? new Date(target).getTime() : target);
  });

  useEffect(() => {
    if (!target) {
      setTime(ZERO);
      return;
    }
    const t = typeof target === 'string' ? new Date(target).getTime() : target;
    const tick = () => setTime(compute(t));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return time;
}
