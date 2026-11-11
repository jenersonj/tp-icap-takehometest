export const AuthEvents = {
  /** Sent to one client when its session expires; it should refresh and reconnect. */
  EXPIRED: 'auth.expired',
} as const;

export type AuthExpiredEventData = Record<string, never>;
