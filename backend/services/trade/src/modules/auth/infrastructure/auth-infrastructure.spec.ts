import { SEED_USERS } from '@blotter/database';
import type { Actor } from '@blotter/contracts';
import { describe, expect, it } from 'vitest';

import { InMemoryUsers, fakeHasher } from '../../../../test/auth-fakes.js';
import { BcryptPasswordHasher } from './bcrypt-password-hasher.js';
import { JoseAccessTokenSigner } from './jose-access-token-signer.js';
import { UserSeeder } from './user-seeder.js';

const actor: Actor = {
  userId: '6f1c2a4e-1111-4222-8333-944455556666',
  username: 'jsmith',
  traderCode: 'JSMITH',
  role: 'TRADER',
  books: ['EQUITIES_US'],
};
const issued = new Date('2026-11-11T10:00:00Z');
const expires = new Date('2026-11-11T10:15:00Z');

describe('BcryptPasswordHasher', () => {
  // Low cost keeps the test fast; production uses 10 rounds.
  const hasher = new BcryptPasswordHasher(4);

  it('verifies the right password only, and never stores the plain text', async () => {
    const hash = await hasher.hash('password123');
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    await expect(hasher.verify('password123', hash)).resolves.toBe(true);
    await expect(hasher.verify('wrong', hash)).resolves.toBe(false);
  });

  it('returns false for an unknown user after doing the same work', async () => {
    await expect(hasher.verify('password123', null)).resolves.toBe(false);
  });
});

describe('JoseAccessTokenSigner', () => {
  const signer = new JoseAccessTokenSigner('a-test-secret-that-is-at-least-32-chars');

  it('round-trips the actor and the expiry', async () => {
    const token = await signer.sign(actor, issued, expires);
    await expect(signer.verify(token, issued)).resolves.toEqual({ actor, expiresAt: expires });
  });

  it('rejects expired tokens, other keys and tampered tokens', async () => {
    const token = await signer.sign(actor, issued, expires);
    await expect(signer.verify(token, expires)).resolves.toBeNull();
    const other = new JoseAccessTokenSigner('another-secret-that-is-at-least-32-chars');
    await expect(other.verify(token, issued)).resolves.toBeNull();
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...actor, role: 'TRADER', sub: 'x' })).toString(
      'base64url',
    );
    await expect(signer.verify(`${header}.${forged}.${signature}`, issued)).resolves.toBeNull();
    await expect(signer.verify('not-a-jwt', issued)).resolves.toBeNull();
  });
});

describe('UserSeeder', () => {
  it('seeds the demo users with hashed passwords when the table is empty', async () => {
    const users = new InMemoryUsers();
    const seeder = new UserSeeder(users, fakeHasher);
    await expect(seeder.seed()).resolves.toBe(SEED_USERS.length);
    const viewer = await users.findByUsername('viewer');
    expect(viewer?.role).toBe('VIEWER');
    expect(viewer?.passwordHash).toBe('hashed:password123');
  });

  it('does nothing when users exist', async () => {
    const users = new InMemoryUsers();
    users.add({
      id: 'u',
      username: 'x',
      password: 'p',
      traderCode: 'X',
      role: 'VIEWER',
      books: [],
    });
    await expect(new UserSeeder(users, fakeHasher).seed()).resolves.toBe(0);
  });
});
