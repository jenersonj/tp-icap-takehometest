import { compare, hash } from 'bcryptjs';

import type { PasswordHasher } from '../application/ports/password-hasher.port.js';

/** bcrypt via bcryptjs (pure JS, so nothing native to build in the Alpine image). */
export class BcryptPasswordHasher implements PasswordHasher {
  private dummyHash?: Promise<string>;

  constructor(private readonly rounds = 10) {}

  hash(password: string): Promise<string> {
    return hash(password, this.rounds);
  }

  async verify(password: string, passwordHash: string | null): Promise<boolean> {
    if (passwordHash) return compare(password, passwordHash);
    this.dummyHash ??= hash('timing-equaliser-for-unknown-users', this.rounds);
    await compare(password, await this.dummyHash);
    return false;
  }
}
