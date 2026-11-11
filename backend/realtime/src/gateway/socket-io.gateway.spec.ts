import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { AuthEvents, TradeEvents, type RedeemedSocketTicketRecord } from '@blotter/contracts';
import type { HttpAdapterHost } from '@nestjs/core';
import { io as connect, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TicketRedeemer } from '../auth/ticket-redeemer.js';
import { SocketIoRealtimeGateway } from './socket-io.gateway.js';

const user = {
  id: 'u-1',
  username: 'viewer',
  traderCode: 'VIEWER',
  role: 'VIEWER',
  books: [],
} as const;

/** Accepts tickets named in `sessions`, once each, like the service does. */
class FakeRedeemer implements TicketRedeemer {
  readonly sessions = new Map<string, Partial<RedeemedSocketTicketRecord>>();

  redeem(ticket: string): Promise<RedeemedSocketTicketRecord> {
    const session = this.sessions.get(ticket);
    this.sessions.delete(ticket);
    if (!session) return Promise.reject(new Error('UNAUTHENTICATED'));
    return Promise.resolve({
      userId: user.id,
      user: { ...user, books: [] },
      allowedGroups: ['trades', 'positions'],
      sessionExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      ...session,
    });
  }
}

let http: HttpServer;
let gateway: SocketIoRealtimeGateway;
let redeemer: FakeRedeemer;
let url: string;
const clients: ClientSocket[] = [];

beforeEach(async () => {
  http = createServer();
  redeemer = new FakeRedeemer();
  gateway = new SocketIoRealtimeGateway({} as HttpAdapterHost, redeemer, {
    CORS_ORIGINS: ['http://localhost:8080'],
  });
  gateway.attach(http);
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await gateway.onApplicationShutdown();
  await new Promise((resolve) => http.close(resolve));
});

function client(ticket?: string): ClientSocket {
  const socket = connect(url, {
    auth: ticket === undefined ? {} : { ticket },
    transports: ['websocket'],
    reconnection: false,
  });
  clients.push(socket);
  return socket;
}

const connected = (socket: ClientSocket) =>
  new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', reject);
  });

const next = <T>(socket: ClientSocket, event: string) =>
  new Promise<T>((resolve) => socket.once(event, resolve));

/** Lets in-flight emits arrive before asserting that something did NOT arrive. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('handshake', () => {
  it('refuses a socket without a ticket or with an unknown one', async () => {
    await expect(connected(client())).rejects.toThrow('unauthorized');
    await expect(connected(client('nope'))).rejects.toThrow('unauthorized');
  });

  it('accepts a ticket once only', async () => {
    redeemer.sessions.set('t-1', {});
    await connected(client('t-1'));
    await expect(connected(client('t-1'))).rejects.toThrow('unauthorized');
  });
});

describe('groups', () => {
  it('joins the allowed groups and receives their events only', async () => {
    redeemer.sessions.set('t-1', {});
    const socket = client('t-1');
    await connected(socket);
    const received: string[] = [];
    socket.onAny((event: string) => received.push(event));

    const created = next<unknown>(socket, TradeEvents.CREATED);
    gateway.emitToGroup('trades', TradeEvents.CREATED, { id: 'x', version: 1 });
    gateway.emitToGroup('prices', 'prices.ticked', { symbols: ['AAPL'], asOf: 'now' });
    await expect(created).resolves.toEqual({ id: 'x', version: 1 });
    await settle();
    expect(received).toEqual([TradeEvents.CREATED]);
  });

  it('acks subscribe and unsubscribe, refusing groups outside allowedGroups', async () => {
    redeemer.sessions.set('t-1', {});
    const socket = client('t-1');
    await connected(socket);

    await expect(socket.emitWithAck('subscribe', { group: 'prices' })).resolves.toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    await expect(socket.emitWithAck('subscribe', { group: 'nope' })).resolves.toEqual({
      ok: false,
      error: 'UNKNOWN_GROUP',
    });
    await expect(socket.emitWithAck('unsubscribe', { group: 'trades' })).resolves.toEqual({
      ok: true,
      group: 'trades',
    });

    const received: string[] = [];
    socket.onAny((event: string) => received.push(event));
    gateway.emitToGroup('trades', TradeEvents.CREATED, { id: 'x', version: 1 });
    await settle();
    expect(received).toEqual([]);
  });

  it('emits to one client and broadcasts to all', async () => {
    redeemer.sessions.set('a', {});
    redeemer.sessions.set('b', {});
    const a = client('a');
    const b = client('b');
    await Promise.all([connected(a), connected(b)]);

    const toA = next(a, AuthEvents.EXPIRED);
    gateway.emitToClient(a.id!, AuthEvents.EXPIRED, {});
    await expect(toA).resolves.toEqual({});

    const both = Promise.all([next(a, TradeEvents.UPDATED), next(b, TradeEvents.UPDATED)]);
    gateway.broadcast(TradeEvents.UPDATED, { id: 'y', version: 2 });
    await expect(both).resolves.toHaveLength(2);
  });
});

describe('session expiry', () => {
  it('tells the client auth.expired and disconnects it when the session ends', async () => {
    redeemer.sessions.set('t-1', {
      sessionExpiresAt: new Date(Date.now() + 150).toISOString(),
    });
    const socket = client('t-1');
    await connected(socket);
    const expired = next(socket, AuthEvents.EXPIRED);
    const disconnected = next<string>(socket, 'disconnect');
    await expect(expired).resolves.toEqual({});
    await expect(disconnected).resolves.toBe('io server disconnect');
  });
});
