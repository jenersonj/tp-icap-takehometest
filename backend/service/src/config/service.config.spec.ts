import { describe, expect, it } from 'vitest';

import { loadServiceConfig } from './service.config.js';

describe('loadServiceConfig', () => {
  it('requires DATABASE_URL', () => {
    expect(() => loadServiceConfig({})).toThrow(/DATABASE_URL/);
  });

  it('applies RabbitMQ defaults', () => {
    const config = loadServiceConfig({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' });
    expect(config.RABBITMQ_EXCHANGE).toBe('blotter');
  });
});
