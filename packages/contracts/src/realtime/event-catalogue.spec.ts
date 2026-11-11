import { describe, expect, it } from 'vitest';

import { ALL_REALTIME_GROUPS } from './groups';
import { REALTIME_EVENT_GROUP, REALTIME_EVENT_NAMES, isRealtimeEventName } from './event-catalogue';

describe('realtime event catalogue', () => {
  it('lists the six events from ARCHITECTURE.md', () => {
    expect(REALTIME_EVENT_NAMES.sort()).toEqual(
      [
        'auth.expired',
        'position.changed',
        'prices.ticked',
        'trade.cancelled',
        'trade.created',
        'trade.updated',
      ].sort(),
    );
  });

  it('delivers every group event to a known topic group', () => {
    for (const group of Object.values(REALTIME_EVENT_GROUP)) {
      if (group !== null) expect(ALL_REALTIME_GROUPS).toContain(group);
    }
  });

  it('recognises event names', () => {
    expect(isRealtimeEventName('trade.created')).toBe(true);
    expect(isRealtimeEventName('trade.deleted')).toBe(false);
  });
});
