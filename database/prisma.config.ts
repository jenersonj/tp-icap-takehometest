import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// Local dev: use the repo-root .env when present.
if (existsSync('../.env')) process.loadEnvFile('../.env');

// Used by the Prisma CLI (generate, migrate). The apps connect through the pg driver adapter
// instead, see src/prisma-client.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://blotter:blotter@localhost:5432/blotter',
  },
});
