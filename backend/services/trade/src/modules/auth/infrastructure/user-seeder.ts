import { SEED_USERS, type SeedUser } from '@blotter/database';
import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import { PASSWORD_HASHER, type PasswordHasher } from '../application/ports/password-hasher.port.js';
import { USER_REPOSITORY, type UserRepository } from '../domain/auth.repositories.js';
import { normaliseUsername } from '../domain/user.js';

/** On first start, when the users table is empty, inserts the demo users with hashed passwords. */
@Injectable()
export class UserSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserSeeder.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const seeded = await this.seed();
    if (seeded > 0) this.logger.log(`Seeded ${seeded} demo users`);
  }

  /** Returns the number of users inserted (0 when users already exist). */
  async seed(seedUsers: readonly SeedUser[] = SEED_USERS): Promise<number> {
    if ((await this.users.count()) > 0) return 0;
    const rows = await Promise.all(
      seedUsers.map(async ({ password, username, ...rest }) => ({
        ...rest,
        username: normaliseUsername(username),
        passwordHash: await this.hasher.hash(password),
      })),
    );
    // skipDuplicates covers two replicas seeding at the same time.
    return this.users.insertMany(rows);
  }
}
