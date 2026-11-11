import type { Role } from '@blotter/contracts';

export interface SeedUser {
  username: string;
  /** Demo credentials only; the service hashes these on seed. */
  password: string;
  traderCode: string;
  role: Role;
  books: string[];
}

/** Demo accounts, listed in the README. */
export const SEED_USERS: readonly SeedUser[] = [
  {
    username: 'jsmith',
    password: 'password123',
    traderCode: 'JSMITH',
    role: 'TRADER',
    books: ['EQUITIES_UK', 'EQUITIES_US', 'TECH_GROWTH', 'FINANCIALS', 'MACRO_HEDGE'],
  },
  {
    username: 'abrown',
    password: 'password123',
    traderCode: 'ABROWN',
    role: 'TRADER',
    books: ['EQUITIES_US', 'TECH_GROWTH'],
  },
  {
    username: 'viewer',
    password: 'password123',
    traderCode: 'VIEWER',
    role: 'VIEWER',
    books: [],
  },
];
