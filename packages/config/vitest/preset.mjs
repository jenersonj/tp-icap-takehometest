// Shared Vitest preset. Each workspace spreads this into its own vitest.config.
/** @type {import('vitest/config').UserConfig['test']} */
export const baseTestConfig = {
  globals: false,
  environment: 'node',
  include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/*.int-spec.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.spec.ts', 'src/**/index.ts', 'src/main.ts'],
  },
};

/** Integration tests talk to real Postgres / RabbitMQ (docker-compose.test.yml or Testcontainers). */
export const integrationTestConfig = {
  ...baseTestConfig,
  include: ['src/**/*.int-spec.ts', 'test/**/*.int-spec.ts'],
  exclude: ['**/node_modules/**', '**/dist/**'],
  testTimeout: 60_000,
  hookTimeout: 120_000,
  fileParallelism: false,
};
