/** Every query key in one place, so realtime events invalidate the right caches. */
export const queryKeys = {
  session: ['auth', 'me'] as const,
  trades: ['trades'] as const,
  trade: (id: string) => ['trades', 'detail', id] as const,
  audit: (id: string) => ['audit', id] as const,
  positions: (book?: string) => ['positions', book ?? 'all'] as const,
  allPositions: ['positions'] as const,
  prices: ['prices'] as const,
};
