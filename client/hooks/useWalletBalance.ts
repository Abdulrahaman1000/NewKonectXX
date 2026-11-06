/** SC-NAV  The signed-in customer's wallet balance, for the bottom menu and other small spots. null = signed out or not loaded. */
import { useQuery } from '@tanstack/react-query';
import { getWallet, hasCustomerToken } from '@/api/wallet';

export function useWalletBalance(): { signedIn: boolean; balance: number | null } {
  const signedIn = hasCustomerToken();
  const q = useQuery({ queryKey: ['wallet'], queryFn: getWallet, enabled: signedIn, retry: false, staleTime: 30_000 });
  return { signedIn, balance: signedIn && q.data ? q.data.balance : null };
}
