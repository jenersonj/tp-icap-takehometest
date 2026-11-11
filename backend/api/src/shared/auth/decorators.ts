import type { Actor } from '@blotter/contracts';
import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const IS_PUBLIC = Symbol('IS_PUBLIC');
export const SKIP_CSRF = Symbol('SKIP_CSRF');

/** No access token needed (login, refresh, logout, health). CSRF still applies to writes. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Skips the CSRF check; only login, which has no CSRF cookie yet. */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);

/** What the session guard attaches to an authenticated request. */
export interface AuthenticatedRequest extends Request {
  actor?: Actor;
  sessionExpiresAt?: string;
}

/** The verified Actor of the request (only on routes that are not @Public). */
export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  const actor = ctx.switchToHttp().getRequest<AuthenticatedRequest>().actor;
  if (!actor) throw new Error('CurrentActor used on a route without an authenticated session');
  return actor;
});

/** Access-token expiry of the request's session. */
export const SessionExpiresAt = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const at = ctx.switchToHttp().getRequest<AuthenticatedRequest>().sessionExpiresAt;
    if (!at) throw new Error('SessionExpiresAt used on a route without an authenticated session');
    return at;
  },
);
