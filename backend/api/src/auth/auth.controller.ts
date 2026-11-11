import {
  AuthCookies,
  AuthPatterns,
  ErrorCode,
  LoginInputSchema,
  type Actor,
  type SessionDto,
} from '@blotter/contracts';
import { CodedError } from '@blotter/messaging';
import { Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { API_CONFIG, type ApiConfig } from '../config/api.config.js';
import { CurrentActor, Public, SessionExpiresAt, SkipCsrf } from '../shared/auth/decorators.js';
import { clearSessionCookies, setSessionCookies } from '../shared/auth/session-cookies.js';
import { RpcClient } from '../shared/rpc-client.js';
import { validate } from '../shared/validate.js';
import { ApiZodBody } from '../shared/zod-openapi.js';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly rpc: RpcClient,
    @Inject(API_CONFIG) private readonly config: Pick<ApiConfig, 'COOKIE_SECURE'>,
  ) {}

  @Post('login')
  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in; sets the session and CSRF cookies' })
  @ApiZodBody(LoginInputSchema)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionDto> {
    const input = validate(LoginInputSchema, req.body);
    const tokens = await this.rpc.request(AuthPatterns.LOGIN, input);
    setSessionCookies(res, tokens, this.config.COOKIE_SECURE);
    return { user: tokens.user, expiresAt: tokens.accessTokenExpiresAt };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and get a new access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionDto> {
    const refreshToken: unknown = req.cookies?.[AuthCookies.REFRESH_TOKEN];
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new CodedError(ErrorCode.UNAUTHENTICATED, 'Not signed in');
    }
    try {
      const tokens = await this.rpc.request(AuthPatterns.REFRESH, { refreshToken });
      setSessionCookies(res, tokens, this.config.COOKIE_SECURE);
      return { user: tokens.user, expiresAt: tokens.accessTokenExpiresAt };
    } catch (error) {
      // A dead refresh token will never work again: drop the cookies so the web shows login.
      clearSessionCookies(res, this.config.COOKIE_SECURE);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the refresh token and clear the cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken: unknown = req.cookies?.[AuthCookies.REFRESH_TOKEN];
    if (typeof refreshToken === 'string' && refreshToken) {
      await this.rpc.request(AuthPatterns.LOGOUT, { refreshToken });
    }
    clearSessionCookies(res, this.config.COOKIE_SECURE);
  }

  @Get('me')
  @ApiCookieAuth(AuthCookies.ACCESS_TOKEN)
  @ApiOperation({ summary: 'The signed-in user and when the session expires' })
  me(@CurrentActor() actor: Actor, @SessionExpiresAt() expiresAt: string): SessionDto {
    const { userId, ...rest } = actor;
    return { user: { id: userId, ...rest }, expiresAt };
  }
}
