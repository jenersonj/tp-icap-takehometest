import { baseTestConfig } from '@blotter/config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { ...baseTestConfig, include: ['src/**/*.spec.ts', 'seed/**/*.spec.ts'] },
});
