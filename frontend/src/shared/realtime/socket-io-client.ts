import { AuthEvents, SOCKET_IO_PATH, type RealtimeEventName } from '@blotter/contracts';
import { io, type Socket } from 'socket.io-client';

import type { ConnectionStatus, RealtimeClient } from './realtime-client';

export interface SocketIoClientOptions {
  /** Fetches a fresh single-use ticket (POST /api/v1/realtime/ticket). */
  getTicket: () => Promise<string>;
  /** Renews the session after auth.expired (POST /api/v1/auth/refresh). */
  refreshSession: () => Promise<boolean>;
  /** Called when the session cannot be renewed. */
  onUnauthenticated?: () => void;
  url?: string;
  /** Delay before retrying after the server refused the handshake. */
  retryDelayMs?: (attempt: number) => number;
  socketFactory?: typeof io;
}

const defaultDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 15_000);

/**
 * Socket.IO adapter. A fresh ticket is fetched for every (re)connect attempt through the
 * `auth` callback, because tickets are single use. Socket.IO retries dropped connections
 * itself; a refused handshake or a server disconnect (session expired) is retried here.
 */
export function createSocketIoClient(options: SocketIoClientOptions): RealtimeClient {
  const statusHandlers = new Set<(s: ConnectionStatus) => void>();
  const reconnectHandlers = new Set<() => void>();
  const eventHandlers = new Map<string, Set<(data: never) => void>>();
  let status: ConnectionStatus = 'idle';
  let socket: Socket | undefined;
  let everConnected = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = true;

  const setStatus = (next: ConnectionStatus) => {
    if (next === status) return;
    status = next;
    for (const h of statusHandlers) h(next);
  };

  const scheduleRetry = () => {
    clearTimeout(retryTimer);
    if (stopped) return;
    setStatus('reconnecting');
    retryTimer = setTimeout(
      () => socket?.connect(),
      (options.retryDelayMs ?? defaultDelay)(attempt++),
    );
  };

  const create = () => {
    const factory = options.socketFactory ?? io;
    const s = factory(options.url ?? '', {
      path: SOCKET_IO_PATH,
      transports: ['websocket'],
      autoConnect: false,
      auth: (cb) => {
        options.getTicket().then(
          (ticket) => cb({ ticket }),
          () => cb({}),
        );
      },
    });
    s.on('connect', () => {
      attempt = 0;
      setStatus('connected');
      if (everConnected) for (const h of reconnectHandlers) h();
      everConnected = true;
    });
    s.on('connect_error', () => {
      // A refused handshake (bad/expired ticket) is not retried by Socket.IO itself.
      if (!s.active) scheduleRetry();
      else setStatus('reconnecting');
    });
    s.on('disconnect', (reason) => {
      if (stopped) return;
      if (reason === 'io server disconnect') scheduleRetry();
      else setStatus('reconnecting');
    });
    s.on(AuthEvents.EXPIRED, () => {
      void options.refreshSession().then((ok) => {
        if (!ok) {
          stop();
          setStatus('offline');
          options.onUnauthenticated?.();
        }
      });
    });
    s.onAny((event: string, data: unknown) => {
      for (const h of eventHandlers.get(event) ?? []) (h as (d: unknown) => void)(data);
    });
    return s;
  };

  const stop = () => {
    stopped = true;
    clearTimeout(retryTimer);
    socket?.disconnect();
  };

  return {
    get status() {
      return status;
    },
    connect() {
      if (!stopped) return;
      stopped = false;
      socket ??= create();
      setStatus(everConnected ? 'reconnecting' : 'connecting');
      socket.connect();
    },
    disconnect() {
      stop();
      setStatus('idle');
    },
    on(event: RealtimeEventName, handler) {
      let set = eventHandlers.get(event);
      if (!set) eventHandlers.set(event, (set = new Set()));
      set.add(handler as (data: never) => void);
      return () => set.delete(handler as (data: never) => void);
    },
    onStatus(handler) {
      statusHandlers.add(handler);
      return () => statusHandlers.delete(handler);
    },
    onReconnect(handler) {
      reconnectHandlers.add(handler);
      return () => reconnectHandlers.delete(handler);
    },
  };
}
