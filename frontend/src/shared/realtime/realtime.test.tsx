import type { RealtimeEventMap, RealtimeEventName } from '@blotter/contracts';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/shared/ui/tooltip';

import { ConnectionStatus } from './connection-status';
import type { ConnectionStatus as Status, RealtimeClient } from './realtime-client';
import { RealtimeProvider, useRealtimeEvent } from './realtime-provider';
import { createSocketIoClient } from './socket-io-client';

/** In-memory RealtimeClient the tests drive by hand. */
class FakeClient implements RealtimeClient {
  status: Status = 'idle';
  private handlers = new Map<string, Set<(d: unknown) => void>>();
  private statusHandlers = new Set<(s: Status) => void>();
  private reconnectHandlers = new Set<() => void>();
  connect = vi.fn(() => this.setStatus('connected'));
  disconnect = vi.fn();
  on<E extends RealtimeEventName>(event: E, h: (d: RealtimeEventMap[E]) => void) {
    const set = this.handlers.get(event) ?? new Set();
    this.handlers.set(event, set);
    set.add(h as (d: unknown) => void);
    return () => set.delete(h as (d: unknown) => void);
  }
  onStatus(h: (s: Status) => void) {
    this.statusHandlers.add(h);
    return () => this.statusHandlers.delete(h);
  }
  onReconnect(h: () => void) {
    this.reconnectHandlers.add(h);
    return () => this.reconnectHandlers.delete(h);
  }
  emit(event: string, data: unknown) {
    for (const h of this.handlers.get(event) ?? []) h(data);
  }
  setStatus(s: Status) {
    this.status = s;
    for (const h of this.statusHandlers) h(s);
  }
  reconnect() {
    for (const h of this.reconnectHandlers) h();
  }
}

function setup(children: ReactNode) {
  const client = new FakeClient();
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RealtimeProvider client={client} onUnauthenticated={() => undefined}>
          {children}
        </RealtimeProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { client, invalidate };
}

function Listener({ onEvent }: { onEvent: (d: unknown) => void }) {
  useRealtimeEvent('trade.created', onEvent);
  return null;
}

describe('RealtimeProvider', () => {
  it('connects, delivers events to useRealtimeEvent and shows the status', () => {
    const onEvent = vi.fn();
    const { client } = setup(
      <>
        <Listener onEvent={onEvent} />
        <ConnectionStatus />
      </>,
    );
    expect(client.connect).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveAccessibleName('Realtime: Live');

    act(() => client.emit('trade.created', { id: 't-1', version: 1 }));
    expect(onEvent).toHaveBeenCalledWith({ id: 't-1', version: 1 });

    act(() => client.setStatus('reconnecting'));
    expect(screen.getByRole('status')).toHaveAccessibleName('Realtime: Reconnecting');
  });

  it('invalidates every query after a reconnect', () => {
    const { client, invalidate } = setup(null);
    act(() => client.reconnect());
    expect(invalidate).toHaveBeenCalledWith();
  });
});

describe('createSocketIoClient', () => {
  /** A stand-in for socket.io-client's Socket. */
  function fakeSocketFactory() {
    const listeners = new Map<string, ((...a: unknown[]) => void)[]>();
    const socket = {
      active: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: (e: string, h: (...a: unknown[]) => void) => {
        listeners.set(e, [...(listeners.get(e) ?? []), h]);
        return socket;
      },
      onAny: (h: (...a: unknown[]) => void) => {
        listeners.set('*', [...(listeners.get('*') ?? []), h]);
        return socket;
      },
      fire: (e: string, ...args: unknown[]) => {
        for (const h of listeners.get(e) ?? []) h(...args);
        if (!['connect', 'connect_error', 'disconnect'].includes(e)) {
          for (const h of listeners.get('*') ?? []) h(e, ...args);
        }
      },
    };
    let auth: ((cb: (data: object) => void) => void) | undefined;
    const factory = vi.fn((_url: string, opts: { auth: typeof auth }) => {
      auth = opts.auth;
      return socket;
    });
    return { socket, factory, auth: () => auth! };
  }

  it('fetches a fresh ticket per attempt, tracks status and reconnects after a refused handshake', async () => {
    vi.useFakeTimers();
    const { socket, factory, auth } = fakeSocketFactory();
    let n = 0;
    const client = createSocketIoClient({
      getTicket: async () => `t-${++n}`,
      refreshSession: async () => true,
      socketFactory: factory as never,
      retryDelayMs: () => 100,
    });
    const statuses: string[] = [];
    client.onStatus((s) => statuses.push(s));
    const reconnected = vi.fn();
    client.onReconnect(reconnected);

    client.connect();
    const cb = vi.fn();
    auth()(cb);
    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith({ ticket: 't-1' }));
    socket.fire('connect');

    socket.fire('disconnect', 'io server disconnect');
    socket.fire('connect_error', new Error('unauthorized'));
    vi.advanceTimersByTime(100);
    expect(socket.connect).toHaveBeenCalledTimes(2);
    socket.fire('connect');
    expect(reconnected).toHaveBeenCalledOnce();
    expect(statuses).toEqual(['connecting', 'connected', 'reconnecting', 'connected']);

    const handler = vi.fn();
    client.on('trade.updated', handler);
    socket.fire('trade.updated', { id: 'x', version: 2 });
    expect(handler).toHaveBeenCalledWith({ id: 'x', version: 2 });
    vi.useRealTimers();
  });

  it('refreshes the session on auth.expired and gives up when that fails', async () => {
    const { socket, factory } = fakeSocketFactory();
    const onUnauthenticated = vi.fn();
    const client = createSocketIoClient({
      getTicket: async () => 't',
      refreshSession: async () => false,
      onUnauthenticated,
      socketFactory: factory as never,
    });
    client.connect();
    socket.fire('connect');
    socket.fire('auth.expired', {});
    await vi.waitFor(() => expect(onUnauthenticated).toHaveBeenCalled());
    expect(client.status).toBe('offline');
  });
});
