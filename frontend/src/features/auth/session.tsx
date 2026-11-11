'use client';

import { Role, type SessionDto, type SessionUser } from '@blotter/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useContext } from 'react';

import { queryKeys } from '@/shared/api/query-keys';

import { authApi } from './auth-api';

export function useSessionQuery() {
  return useQuery({ queryKey: queryKeys.session, queryFn: authApi.me, retry: false });
}

const SessionContext = createContext<SessionDto | null>(null);
export const SessionProvider = SessionContext.Provider;

/** The signed-in user; only inside the AuthGuard. */
export function useCurrentUser(): SessionUser {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useCurrentUser must be used inside <AuthGuard>');
  return session.user;
}

/** VIEWERs are read-only: the UI hides every write action (the service enforces it too). */
export function useCanTrade(): boolean {
  return useCurrentUser().role === Role.TRADER;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });
}
