import { describe, expect, it } from 'vitest';

import { loadRealtimeConfig } from './realtime.config.js';

describe('loadRealtimeConfig', () => {
  it('applies defaults and splits CORS origins', () => {
    const config = loadRealtimeConfig({ CORS_ORIGINS: 'http://a.test, http://b.test' });
    expect(config.PORT).toBe(3001);
    expect(config.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
  });

  it('fails fast on invalid values', () => {
    expect(() => loadRealtimeConfig({ PORT: 'abc' })).toThrow(
      /Invalid realtime configuration: PORT/,
    );
  });
});
