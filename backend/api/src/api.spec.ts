import { AuthCookies, CSRF_HEADER } from '@blotter/contracts';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { fakeService, tradeId, trader } from '../test/fake-service.js';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { loadApiConfig } from './config/api.config.js';

let app: INestApplication;
let service: ReturnType<typeof fakeService>;

beforeAll(async () => {
  service = fakeService();
  const config = { ...loadApiConfig({}), COOKIE_SECURE: true };
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register(config, service.bus)],
  }).compile();
  app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.init();
});

afterAll(async () => app.close());

beforeEach(() => {
  service.calls.length = 0;
});

const http = () => request(app.getHttpServer());

/** Parses Set-Cookie into name -> raw header, for flag assertions. */
function setCookies(res: request.Response): Record<string, string> {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return Object.fromEntries((raw ?? []).map((c) => [c.split('=')[0]!, c]));
}

/** Signs in and returns what a browser would send back: cookies plus the CSRF header. */
async function signIn() {
  const res = await http()
    .post('/api/v1/auth/login')
    .send({ username: 'jsmith', password: 'password123' })
    .expect(200);
  const cookies = setCookies(res);
  const value = (name: string) => cookies[name]!.split(';')[0]!;
  const csrf = value(AuthCookies.CSRF_TOKEN).split('=')[1]!;
  return {
    cookie: [value(AuthCookies.ACCESS_TOKEN), value(AuthCookies.CSRF_TOKEN)].join('; '),
    refreshCookie: [value(AuthCookies.REFRESH_TOKEN), value(AuthCookies.CSRF_TOKEN)].join('; '),
    csrf,
  };
}

describe('auth', () => {
  it('login sets httpOnly Strict Secure session cookies, a readable CSRF cookie, and returns the user', async () => {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ username: 'jsmith', password: 'password123' })
      .expect(200);
    expect(res.body).toEqual({
      user: expect.objectContaining({ id: trader.userId, role: 'TRADER' }),
      expiresAt: '2026-11-11T10:15:00.000Z',
    });
    const cookies = setCookies(res);
    expect(cookies[AuthCookies.ACCESS_TOKEN]).toMatch(/HttpOnly/);
    expect(cookies[AuthCookies.ACCESS_TOKEN]).toMatch(/SameSite=Strict/);
    expect(cookies[AuthCookies.ACCESS_TOKEN]).toMatch(/Secure/);
    expect(cookies[AuthCookies.ACCESS_TOKEN]).toMatch(/Path=\/api;/);
    expect(cookies[AuthCookies.REFRESH_TOKEN]).toMatch(/Path=\/api\/v1\/auth;/);
    expect(cookies[AuthCookies.REFRESH_TOKEN]).toMatch(/HttpOnly/);
    expect(cookies[AuthCookies.CSRF_TOKEN]).not.toMatch(/HttpOnly/);
    expect(JSON.stringify(res.body)).not.toContain('access-');
  });

  it('maps a failed login to 401 with the error body', async () => {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ username: 'jsmith', password: 'wrong' })
      .expect(401);
    expect(res.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Invalid username or password',
      correlationId: expect.any(String),
    });
  });

  it('rejects a malformed login body with 400 and field details, without calling the service', async () => {
    const res = await http().post('/api/v1/auth/login').send({ username: '' }).expect(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.details.map((d: { path: string }) => d.path)).toEqual(['username', 'password']);
    expect(service.calls).toEqual([]);
  });

  it('me needs the access cookie', async () => {
    await http().get('/api/v1/auth/me').expect(401);
    await http()
      .get('/api/v1/auth/me')
      .set('Cookie', `${AuthCookies.ACCESS_TOKEN}=forged`)
      .expect(401);
    const { cookie } = await signIn();
    const res = await http().get('/api/v1/auth/me').set('Cookie', cookie).expect(200);
    expect(res.body.user).toEqual({
      id: trader.userId,
      username: 'jsmith',
      traderCode: 'JSMITH',
      role: 'TRADER',
      books: ['EQUITIES_US'],
    });
  });

  it('refresh needs CSRF, rotates the cookies, and clears them when the token is dead', async () => {
    const { refreshCookie, csrf } = await signIn();
    await http().post('/api/v1/auth/refresh').set('Cookie', refreshCookie).expect(403);
    const res = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .set(CSRF_HEADER, csrf)
      .expect(200);
    expect(setCookies(res)[AuthCookies.REFRESH_TOKEN]).toMatch(/^blotter_rt=refresh-\d+;/);

    const dead = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${AuthCookies.REFRESH_TOKEN}=stolen; ${AuthCookies.CSRF_TOKEN}=${csrf}`)
      .set(CSRF_HEADER, csrf)
      .expect(401);
    expect(setCookies(dead)[AuthCookies.REFRESH_TOKEN]).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('logout revokes the refresh token and clears the cookies', async () => {
    const { refreshCookie, csrf } = await signIn();
    service.calls.length = 0;
    const res = await http()
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshCookie)
      .set(CSRF_HEADER, csrf)
      .expect(204);
    expect(service.calls).toEqual([
      { pattern: 'auth.logout', payload: { refreshToken: expect.any(String) } },
    ]);
    expect(Object.keys(setCookies(res)).sort()).toEqual(
      [AuthCookies.ACCESS_TOKEN, AuthCookies.CSRF_TOKEN, AuthCookies.REFRESH_TOKEN].sort(),
    );
  });
});

describe('CSRF', () => {
  it('rejects writes without the header or with a mismatched one', async () => {
    const { cookie, csrf } = await signIn();
    const body = { version: 1, changes: { quantity: 1 } };
    await http().patch(`/api/v1/trades/${tradeId}`).set('Cookie', cookie).send(body).expect(403);
    const res = await http()
      .patch(`/api/v1/trades/${tradeId}`)
      .set('Cookie', cookie)
      .set(CSRF_HEADER, `${csrf.slice(0, -1)}x`)
      .send(body)
      .expect(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(service.calls.some((c) => c.pattern === 'trade.amend')).toBe(false);
  });
});

describe('trades', () => {
  it('lists with the parsed query and maps records to DTOs', async () => {
    const { cookie } = await signIn();
    const res = await http()
      .get('/api/v1/trades?status=ACTIVE&symbol=aap&sort=-price&page=2&pageSize=50')
      .set('Cookie', cookie)
      .expect(200);
    expect(service.calls.find((c) => c.pattern === 'trade.list')?.payload).toEqual({
      status: 'ACTIVE',
      symbol: 'aap',
      sort: { field: 'price', direction: 'desc' },
      page: 2,
      pageSize: 50,
    });
    expect(res.body).toMatchObject({ total: 1, page: 2, pageSize: 50 });
    expect(res.body.items[0]).toEqual({
      id: tradeId,
      tradeRef: 'TRD-100001',
      symbol: 'AAPL',
      side: 'BUY',
      quantity: 300,
      price: 227.455,
      notional: 68236.5,
      trader: 'JSMITH',
      book: 'EQUITIES_US',
      counterparty: 'Citi',
      tradeTimestamp: '2026-11-11T09:00:00.000Z',
      status: 'ACTIVE',
      version: 1,
      updatedAt: '2026-11-11T09:00:00.000Z',
    });
  });

  it('rejects a bad list query with 400', async () => {
    const { cookie } = await signIn();
    const res = await http().get('/api/v1/trades?sort=password').set('Cookie', cookie).expect(400);
    expect(res.body.details[0].path).toBe('sort');
  });

  it('maps NOT_FOUND to 404 and a non-uuid id to 400', async () => {
    const { cookie } = await signIn();
    await http()
      .get('/api/v1/trades/33333333-3333-4333-8333-333333333333')
      .set('Cookie', cookie)
      .expect(404);
    await http().get('/api/v1/trades/not-a-uuid').set('Cookie', cookie).expect(400);
  });

  it('creates with the Actor from the session, never from the body', async () => {
    const { cookie, csrf } = await signIn();
    const res = await http()
      .post('/api/v1/trades')
      .set('Cookie', cookie)
      .set(CSRF_HEADER, csrf)
      .send({
        symbol: 'msft',
        side: 'SELL',
        quantity: 10,
        price: 534.22,
        trader: 'jsmith',
        book: 'EQUITIES_US',
        counterparty: 'Citi',
        actor: { userId: 'someone-else' },
      })
      .expect(201);
    const payload = service.calls.find((c) => c.pattern === 'trade.create')?.payload as {
      actor: unknown;
      input: Record<string, unknown>;
    };
    expect(payload.actor).toEqual(trader);
    expect(payload.input).toMatchObject({ symbol: 'MSFT', trader: 'JSMITH' });
    expect(payload.input).not.toHaveProperty('actor');
    expect(res.body).toMatchObject({ symbol: 'MSFT', price: 534.22, notional: 5342.2 });
  });

  it('amends, mapping a stale version to 409', async () => {
    const { cookie, csrf } = await signIn();
    const amend = (version: number) =>
      http()
        .patch(`/api/v1/trades/${tradeId}`)
        .set('Cookie', cookie)
        .set(CSRF_HEADER, csrf)
        .send({ version, changes: { quantity: 400 } });
    expect((await amend(1).expect(200)).body).toMatchObject({ quantity: 400, version: 2 });
    expect((await amend(5).expect(409)).body.code).toBe('VERSION_CONFLICT');
  });

  it('cancels with an optional reason', async () => {
    const { cookie, csrf } = await signIn();
    const res = await http()
      .post(`/api/v1/trades/${tradeId}/cancel`)
      .set('Cookie', cookie)
      .set(CSRF_HEADER, csrf)
      .send({ version: 1, reason: 'fat finger' })
      .expect(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(service.calls.find((c) => c.pattern === 'trade.cancel')?.payload).toEqual({
      actor: trader,
      id: tradeId,
      version: 1,
      reason: 'fat finger',
    });
  });

  it('returns the audit trail with field diffs', async () => {
    const { cookie } = await signIn();
    const res = await http()
      .get(`/api/v1/trades/${tradeId}/audit`)
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body[0]).toMatchObject({
      action: 'CREATED',
      actor: 'JSMITH',
      changes: [
        { field: 'symbol', from: null, to: 'AAPL' },
        { field: 'quantity', from: null, to: 300 },
      ],
    });
    expect(res.body[1].changes).toEqual([{ field: 'quantity', from: 300, to: 400 }]);
  });
});

describe('positions, prices, realtime ticket', () => {
  it('maps positions to numbers with totals that skip unpriced symbols', async () => {
    const { cookie } = await signIn();
    const res = await http()
      .get('/api/v1/positions?book=EQUITIES_US')
      .set('Cookie', cookie)
      .expect(200);
    expect(service.calls.find((c) => c.pattern === 'position.list')?.payload).toEqual({
      book: 'EQUITIES_US',
    });
    expect(res.body).toMatchObject({
      totalUnrealisedPnl: 150,
      totalRealisedPnl: 199.5,
      totalMarketValue: 750,
    });
    expect(res.body.positions[0]).toMatchObject({
      averagePrice: 10,
      lastPrice: 12.5,
      realisedPnl: 200,
    });
    expect(res.body.positions[1]).toMatchObject({ lastPrice: null, unrealisedPnl: null });
  });

  it('splits ?symbols= and maps prices to numbers', async () => {
    const { cookie } = await signIn();
    const res = await http()
      .get('/api/v1/prices?symbols=aapl,%20msft')
      .set('Cookie', cookie)
      .expect(200);
    expect(service.calls.find((c) => c.pattern === 'price.list')?.payload).toEqual({
      symbols: ['AAPL', 'MSFT'],
    });
    expect(res.body).toEqual([{ symbol: 'AAPL', price: 227.45, asOf: '2026-11-11T10:00:00.000Z' }]);
  });

  it('issues a socket ticket for the session user', async () => {
    const { cookie, csrf } = await signIn();
    const res = await http()
      .post('/api/v1/realtime/ticket')
      .set('Cookie', cookie)
      .set(CSRF_HEADER, csrf)
      .send({ userId: 'someone-else' })
      .expect(200);
    expect(res.body).toEqual({ ticket: 'ticket-1', expiresAt: '2026-11-11T10:00:30.000Z' });
    expect(service.calls.find((c) => c.pattern === 'auth.issueSocketTicket')?.payload).toEqual({
      userId: trader.userId,
      sessionExpiresAt: '2026-11-11T10:15:00.000Z',
    });
  });

  it('serves the Swagger document', async () => {
    const res = await http().get('/api/docs-json').expect(200);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/api/v1/trades', '/api/v1/auth/login', '/api/v1/positions']),
    );
  });

  it('returns the error shape for unknown routes', async () => {
    const res = await http().get('/api/v1/nope').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
