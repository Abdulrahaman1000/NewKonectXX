/**
 * SC-CONNECT  Small switches for the menus.
 *  - useVtuEnabled(): true only when recharge is switched on at the server (so the live site shows no Pay links until it is).
 *  - showAccountLinks: "My account" links show on your laptop; on the live site only when VITE_SHOW_ACCOUNT=yes is set
 *    (set it once the Resend domain is verified, so customers actually receive their sign-in codes).
 */
import { useQuery } from '@tanstack/react-query';
import { getCatalog } from '@/api/vtu';

export function useVtuEnabled(): boolean {
  const { data } = useQuery({ queryKey: ['vtu-catalog'], queryFn: getCatalog, retry: false, staleTime: 5 * 60 * 1000 });
  return Boolean(data?.enabled);
}

const env: any = (import.meta as any).env ?? {};
export const showAccountLinks: boolean = Boolean(env.DEV) || env.VITE_SHOW_ACCOUNT === 'yes';
