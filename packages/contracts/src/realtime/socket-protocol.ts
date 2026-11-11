import type { RealtimeGroup } from './groups.js';

/** Messages the web sends to realtime over the socket (with Socket.IO acks). */
export const SocketClientMessages = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
} as const;

export interface SubscribeMessage {
  group: RealtimeGroup;
}

export type SubscribeAck =
  { ok: true; group: RealtimeGroup } | { ok: false; error: 'FORBIDDEN' | 'UNKNOWN_GROUP' };

/** Handshake: `io(url, { auth: { ticket } })`. */
export interface SocketHandshakeAuth {
  ticket: string;
}

export const SOCKET_IO_PATH = '/socket.io';
