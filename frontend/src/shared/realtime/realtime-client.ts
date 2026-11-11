import type { RealtimeEventMap, RealtimeEventName } from '@blotter/contracts';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

/**
 * The web's view of realtime, independent of Socket.IO. Events only tell the app to refetch;
 * every piece of data on screen still comes from the API.
 */
export interface RealtimeClient {
  connect(): void;
  disconnect(): void;
  readonly status: ConnectionStatus;
  on<E extends RealtimeEventName>(
    event: E,
    handler: (data: RealtimeEventMap[E]) => void,
  ): () => void;
  onStatus(handler: (status: ConnectionStatus) => void): () => void;
  /** Called after a reconnect (not the first connect), so caches can catch up. */
  onReconnect(handler: () => void): () => void;
}
