import { randomBytes } from 'node:crypto';

import { AuthCookies, type AuthTokensRecord } from '@blotter/contracts';
import type { CookieOptions, Response } from 'express';

/** The refresh token only travels to the auth routes that need it. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
export const ACCESS_COOKIE_PATH = '/api';

/**
 * Decision 10: both tokens in httpOnly, SameSite=Strict cookies (Secure in production),
 * plus a readable CSRF cookie for the double-submit check.
 */
export function setSessionCookies(res: Response, tokens: AuthTokensRecord, secure: boolean): void {
  const base: CookieOptions = { httpOnly: true, sameSite: 'strict', secure };
  const refreshExpires = new Date(tokens.refreshTokenExpiresAt);
  res.cookie(AuthCookies.ACCESS_TOKEN, tokens.accessToken, {
    ...base,
    path: ACCESS_COOKIE_PATH,
    expires: new Date(tokens.accessTokenExpiresAt),
  });
  res.cookie(AuthCookies.REFRESH_TOKEN, tokens.refreshToken, {
    ...base,
    path: REFRESH_COOKIE_PATH,
    expires: refreshExpires,
  });
  res.cookie(AuthCookies.CSRF_TOKEN, randomBytes(32).toString('base64url'), {
    httpOnly: false,
    sameSite: 'strict',
    secure,
    path: '/',
    expires: refreshExpires,
  });
}

export function clearSessionCookies(res: Response, secure: boolean): void {
  const base: CookieOptions = { sameSite: 'strict', secure };
  res.clearCookie(AuthCookies.ACCESS_TOKEN, { ...base, httpOnly: true, path: ACCESS_COOKIE_PATH });
  res.clearCookie(AuthCookies.REFRESH_TOKEN, {
    ...base,
    httpOnly: true,
    path: REFRESH_COOKIE_PATH,
  });
  res.clearCookie(AuthCookies.CSRF_TOKEN, { ...base, path: '/' });
}
