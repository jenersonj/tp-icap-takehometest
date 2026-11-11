'use client';

import type { RealtimeEventMap, RealtimeEventName, SocketTicketDto } from '@blotter/contracts';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { api, refreshSession } from '../api/api-client';
import type { ConnectionStatus, RealtimeClient } from './realtime-client';
import { createSocketIoClient } from './socket-io-client';

const RealtimeContext = createContext<RealtimeClient | null>(null);

export function defaultRealtimeClient(onUnauthenticated: () => void): RealtimeClient {
  return createSocketIoClient({
    getTicket: () => api.post<SocketTicketDto>('/realtime/ticket').then((r) => r.ticket),
    refreshSession,
    onUnauthenticated,
  });
}

/**
 * One socket per signed-in session. After a reconnect every query is invalidated, since
 * events may have been missed while offline.
 */
export function RealtimeProvider({
  children,
  client: injected,
  onUnauthenticated,
}: {
  children: ReactNode;
  client?: RealtimeClient;
  onUnauthenticated: () => void;
}) {
  const queryClient = useQueryClient();
  const onUnauthRef = useRef(onUnauthenticated);
  onUnauthRef.current = onUnauthenticated;
  const [client] = useState(() => injected ?? defaultRealtimeClient(() => onUnauthRef.current()));

  useEffect(() => {
    const off = client.onReconnect(() => void queryClient.invalidateQueries());
    client.connect();
    return () => {
      off();
      client.disconnect();
    };
  }, [client, queryClient]);

  return <RealtimeContext.Provider value={client}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeClient(): RealtimeClient | null {
  return useContext(RealtimeContext);
}

/** Subscribes to one realtime event for the lifetime of the component. */
export function useRealtimeEvent<E extends RealtimeEventName>(
  event: E,
  handler: (data: RealtimeEventMap[E]) => void,
): void {
  const client = useRealtimeClient();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => client?.on(event, (data) => ref.current(data)), [client, event]);
}

export function useRealtimeStatus(): ConnectionStatus {
  const client = useRealtimeClient();
  return useSyncExternalStore(
    (notify) => client?.onStatus(notify) ?? (() => undefined),
    () => client?.status ?? 'idle',
    () => 'idle',
  );
}
