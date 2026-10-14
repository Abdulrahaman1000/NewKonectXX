import { useEffect, useState } from 'react';

/** True below Tailwind's `md` breakpoint (768px). */
const QUERY = '(max-width: 767px)';

export function useMobileLayout() {
  const get = () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
  const [isMobile, setIsMobile] = useState(get);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return isMobile;
}