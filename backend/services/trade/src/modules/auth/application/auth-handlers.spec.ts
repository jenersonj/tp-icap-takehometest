import type { DomainError } from '../../../shared/domain/domain-error.js';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  FakeSigner,
  InMemoryRefreshTokens,
  InMemorySocketTickets,
  InMemoryUsers,
  fakeHasher,
} from '../../../../test/auth-fakes.js';
import { passThroughUnitOfWork } from '../../../../test/fakes.js';
import { FixedClock } from '../../../shared/domain/clock.js';
import { SOCKET_TICKET_TTL_MS } from '../domain/auth-policy.js';
import { hashToken } from '../domain/opaque-token.js';
import {
  IssueSocketTicketCommand,
  IssueSocketTicketHandler,
} from './commands/issue-socket-ticket.command.js';
import { LoginCommand, LoginHandler } from './commands/login.command.js';
import { LogoutCommand, LogoutHandler } from './commands/logout.command.js';
import {
  RedeemSocketTicketCommand,
  RedeemSocketTicketHandler,
} from './commands/redeem-socket-ticket.command.js';
import {
  RefreshSessionCommand,
  RefreshSessionHandler,
} from './commands/refresh-session.command.js';
import {
  VerifyAccessTokenHandler,
  VerifyAccessTokenQuery,
} from './queries/verify-access-token.query.js';
import { SessionIssuer } from './session-issuer.js';

const start = new Date('2026-11-11T10:00:00Z');
const config = { ACCESS_TOKEN_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_SECONDS: 3600 };

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as DomainError).code;
  }
}

let clock: FixedClock;
let users: InMemoryUsers;
let refreshTokens: InMemoryRefreshTokens;
let tickets: InMemorySocketTickets;
let signer: FakeSigner;
let login: LoginHandler;
let refresh: RefreshSessionHandler;

beforeEach(() => {
  clock = new FixedClock(start);
  users = new InMemoryUsers();
  refreshTokens = new InMemoryRefreshTokens();
  tickets = new InMemorySocketTickets();
  signer = new FakeSigner();
  const sessions = new SessionIssuer(signer, refreshTokens, config);
  login = new LoginHandler(users, fakeHasher, clock, sessions);
  refresh = new RefreshSessionHandler(refreshTokens, users, passThroughUnitOfWork, clock, sessions);
  users.add({
    id: 'u-1',
    username: 'jsmith',
    password: 'pw',
    traderCode: 'JSMITH',
    role: 'TRADER',
    books: ['EQUITIES_US'],
  });
  users.add({
    id: 'u-2',
    username: 'viewer',
    password: 'pw',
    traderCode: 'VIEWER',
    role: 'VIEWER',
    books: [],
  });
});

describe('LoginHandler', () => {
  it('returns tokens and the user, and stores only the refresh token hash', async () => {
    const result = await login.execute(new LoginCommand(' JSmith ', 'pw'));
    expect(result.user).toEqual({
      id: 'u-1',
      username: 'jsmith',
      traderCode: 'JSMITH',
      role: 'TRADER',
      books: ['EQUITIES_US'],
    });
    expect(result.accessTokenExpiresAt).toBe('2026-11-11T10:15:00.000Z');
    expect(result.refreshTokenExpiresAt).toBe('2026-11-11T11:00:00.000Z');
    expect(refreshTokens.rows).toHaveLength(1);
    expect(refreshTokens.rows[0]!.tokenHash).toBe(hashToken(result.refreshToken));
    expect(JSON.stringify(refreshTokens.rows)).not.toContain(result.refreshToken);
  });

  it('gives the same UNAUTHENTICATED error for a wrong password and an unknown user', async () => {
    const wrong = login.execute(new LoginCommand('jsmith', 'nope'));
    await expect(wrong).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Invalid username or password',
    });
    await expect(login.execute(new LoginCommand('ghost', 'pw'))).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Invalid username or password',
    });
  });
});

describe('RefreshSessionHandler', () => {
  it('rotates: the old refresh token is revoked and a new pair is issued', async () => {
    const first = await login.execute(new LoginCommand('jsmith', 'pw'));
    clock.advance(60_000);
    const second = await refresh.execute(new RefreshSessionCommand(first.refreshToken));

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessTokenExpiresAt).toBe('2026-11-11T10:16:00.000Z');
    expect(refreshTokens.rows.map((t) => Boolean(t.revokedAt))).toEqual([true, false]);
  });

  it('treats reuse of a rotated token as theft and revokes every session of the user', async () => {
    const first = await login.execute(new LoginCommand('jsmith', 'pw'));
    await refresh.execute(new RefreshSessionCommand(first.refreshToken));

    expect(await codeOf(refresh.execute(new RefreshSessionCommand(first.refreshToken)))).toBe(
      'UNAUTHENTICATED',
    );
    expect(refreshTokens.rows.every((t) => t.revokedAt)).toBe(true);
  });

  it('rejects expired and unknown tokens', async () => {
    const first = await login.execute(new LoginCommand('jsmith', 'pw'));
    clock.advance(3600_000);
    expect(await codeOf(refresh.execute(new RefreshSessionCommand(first.refreshToken)))).toBe(
      'UNAUTHENTICATED',
    );
    expect(await codeOf(refresh.execute(new RefreshSessionCommand('x'.repeat(43))))).toBe(
      'UNAUTHENTICATED',
    );
  });
});

describe('LogoutHandler', () => {
  it('revokes the refresh token and is idempotent', async () => {
    const logout = new LogoutHandler(refreshTokens, clock);
    const { refreshToken } = await login.execute(new LoginCommand('jsmith', 'pw'));
    await expect(logout.execute(new LogoutCommand(refreshToken))).resolves.toEqual({
      revoked: true,
    });
    await expect(logout.execute(new LogoutCommand(refreshToken))).resolves.toEqual({
      revoked: false,
    });
    expect(await codeOf(refresh.execute(new RefreshSessionCommand(refreshToken)))).toBe(
      'UNAUTHENTICATED',
    );
  });
});

describe('VerifyAccessTokenHandler', () => {
  it('returns the actor for a live token and rejects an expired one', async () => {
    const verify = new VerifyAccessTokenHandler(signer, clock);
    const { accessToken } = await login.execute(new LoginCommand('viewer', 'pw'));

    const verified = await verify.execute(new VerifyAccessTokenQuery(accessToken));
    expect(verified).toEqual({
      actor: {
        userId: 'u-2',
        username: 'viewer',
        traderCode: 'VIEWER',
        role: 'VIEWER',
        books: [],
      },
      expiresAt: '2026-11-11T10:15:00.000Z',
    });

    clock.advance(900_000);
    expect(await codeOf(verify.execute(new VerifyAccessTokenQuery(accessToken)))).toBe(
      'UNAUTHENTICATED',
    );
  });
});

describe('socket tickets', () => {
  const sessionEnd = new Date(start.getTime() + 600_000);
  let issue: IssueSocketTicketHandler;
  let redeem: RedeemSocketTicketHandler;

  beforeEach(() => {
    issue = new IssueSocketTicketHandler(users, tickets, clock, config);
    redeem = new RedeemSocketTicketHandler(tickets, users, clock);
  });

  it('issues a 30 s ticket, stored hashed, that redeems once to the user and groups', async () => {
    const { ticket, expiresAt } = await issue.execute(
      new IssueSocketTicketCommand('u-2', sessionEnd),
    );
    expect(expiresAt).toBe(new Date(start.getTime() + SOCKET_TICKET_TTL_MS).toISOString());
    expect(tickets.rows[0]!.id).toBe(hashToken(ticket));

    const redeemed = await redeem.execute(new RedeemSocketTicketCommand(ticket));
    expect(redeemed).toEqual({
      userId: 'u-2',
      user: { id: 'u-2', username: 'viewer', traderCode: 'VIEWER', role: 'VIEWER', books: [] },
      allowedGroups: ['trades', 'positions', 'prices'],
      sessionExpiresAt: sessionEnd.toISOString(),
    });

    expect(await codeOf(redeem.execute(new RedeemSocketTicketCommand(ticket)))).toBe(
      'UNAUTHENTICATED',
    );
  });

  it('rejects a ticket redeemed after 30 s', async () => {
    const { ticket } = await issue.execute(new IssueSocketTicketCommand('u-1', sessionEnd));
    clock.advance(SOCKET_TICKET_TTL_MS);
    expect(await codeOf(redeem.execute(new RedeemSocketTicketCommand(ticket)))).toBe(
      'UNAUTHENTICATED',
    );
  });

  it('refuses an already expired session and caps the session at the access-token TTL', async () => {
    expect(await codeOf(issue.execute(new IssueSocketTicketCommand('u-1', start)))).toBe(
      'UNAUTHENTICATED',
    );
    expect(await codeOf(issue.execute(new IssueSocketTicketCommand('nobody', sessionEnd)))).toBe(
      'UNAUTHENTICATED',
    );

    const farFuture = new Date(start.getTime() + 24 * 3600_000);
    await issue.execute(new IssueSocketTicketCommand('u-1', farFuture));
    expect(tickets.rows.at(-1)!.sessionExpiresAt).toEqual(new Date(start.getTime() + 900_000));
  });
});
