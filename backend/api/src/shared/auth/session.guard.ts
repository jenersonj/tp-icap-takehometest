import { timingSafeEqual } from 'node:crypto';

import { AuthCookies, AuthPatterns, CSRF_HEADER, ErrorCode } from '@blotter/contracts';
import { CodedError } from '@blotter/messaging';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RpcClient } from '../rpc-client.js';
import { IS_PUBLIC, SKIP_CSRF, type AuthenticatedRequest } from './decorators.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Global guard, in two steps:
 * 1. CSRF (double submit): every non-GET request must echo the readable CSRF cookie in the
 *    X-CSRF-Token header, except login.
 * 2. Session: the access-token cookie is checked by the service (auth.verifyAccessToken)
 *    and the Actor it returns is attached to the request for the controllers to forward.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rpc: RpcClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const targets = [context.getHandler(), context.getClass()];

    if (!SAFE_METHODS.has(req.method) && !this.reflector.getAllAndOverride(SKIP_CSRF, targets)) {
      assertCsrf(req.cookies?.[AuthCookies.CSRF_TOKEN], req.get(CSRF_HEADER));
    }
    if (this.reflector.getAllAndOverride(IS_PUBLIC, targets)) return true;

    const accessToken: unknown = req.cookies?.[AuthCookies.ACCESS_TOKEN];
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new CodedError(ErrorCode.UNAUTHENTICATED, 'Not signed in');
    }
    const verified = await this.rpc.request(AuthPatterns.VERIFY_ACCESS_TOKEN, { accessToken });
    req.actor = verified.actor;
    req.sessionExpiresAt = verified.expiresAt;
    return true;
  }
}

export function assertCsrf(cookie: unknown, header: string | undefined): void {
  const ok =
    typeof cookie === 'string' &&
    cookie.length > 0 &&
    typeof header === 'string' &&
    header.length === cookie.length &&
    timingSafeEqual(Buffer.from(header), Buffer.from(cookie));
  if (!ok) throw new CodedError(ErrorCode.FORBIDDEN, 'Missing or invalid CSRF token');
}
