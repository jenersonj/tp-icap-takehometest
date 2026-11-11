'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { onSessionExpired } from '@/shared/api/api-client';
import { isApiError } from '@/shared/api/api-error';
import { RealtimeProvider } from '@/shared/realtime/realtime-provider';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

import { SessionProvider, useSessionQuery } from './session';

/**
 * Client-side route guard: asks GET /auth/me (which refreshes the session on a 401 first)
 * and sends the user to /login when there is no session. Opens the realtime connection
 * only once signed in.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const unauthenticated = isApiError(session.error) && session.error.isUnauthenticated;

  useEffect(() => {
    const toLogin = () => {
      queryClient.clear();
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    };
    if (unauthenticated) toLogin();
    return onSessionExpired(toLogin);
  }, [unauthenticated, pathname, queryClient, router]);

  if (session.data) {
    return (
      <SessionProvider value={session.data}>
        <RealtimeProvider
          onUnauthenticated={() => router.replace(`/login?next=${encodeURIComponent(pathname)}`)}
        >
          {children}
        </RealtimeProvider>
      </SessionProvider>
    );
  }
  if (session.isError && !unauthenticated) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-sm">
        <p className="text-muted-foreground">Could not reach the blotter API.</p>
        <Button size="sm" variant="outline" onClick={() => void session.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <div className="flex min-h-svh items-center justify-center" aria-busy="true">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
