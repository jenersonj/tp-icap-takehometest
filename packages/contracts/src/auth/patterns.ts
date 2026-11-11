export const AuthPatterns = {
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  LOGOUT: 'auth.logout',
  ISSUE_SOCKET_TICKET: 'auth.issueSocketTicket',
  REDEEM_SOCKET_TICKET: 'auth.redeemSocketTicket',
  /** The API checks the access-token cookie with the service and gets the Actor back. */
  VERIFY_ACCESS_TOKEN: 'auth.verifyAccessToken',
} as const;

/** Cookie and header names shared by the API and the web. */
export const AuthCookies = {
  ACCESS_TOKEN: 'blotter_at',
  REFRESH_TOKEN: 'blotter_rt',
  CSRF_TOKEN: 'blotter_csrf',
} as const;

export const CSRF_HEADER = 'x-csrf-token';
