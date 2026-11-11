/** Topic groups a socket may join. Never per-user (decision: topic groups only). */
export const RealtimeGroup = {
  TRADES: 'trades',
  POSITIONS: 'positions',
  PRICES: 'prices',
} as const;
export type RealtimeGroup = (typeof RealtimeGroup)[keyof typeof RealtimeGroup];

export const ALL_REALTIME_GROUPS: readonly RealtimeGroup[] = Object.values(RealtimeGroup);

export function isRealtimeGroup(value: unknown): value is RealtimeGroup {
  return typeof value === 'string' && (ALL_REALTIME_GROUPS as readonly string[]).includes(value);
}
