export const SystemPatterns = {
  /** Liveness round trip used by /health checks. */
  PING: 'system.ping',
} as const;

export interface PingResponse {
  service: string;
  status: 'ok';
  at: string;
}
