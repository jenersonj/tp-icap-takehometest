import { describe, expect, it } from 'vitest';

import type { RealtimeGateway } from '../gateway/realtime-gateway.js';
import { RealtimeCommandsController } from './realtime-commands.controller.js';

function setup() {
  const calls: unknown[][] = [];
  const gateway: RealtimeGateway = {
    emitToGroup: (...args) => void calls.push(['group', ...args]),
    emitToClient: (...args) => void calls.push(['client', ...args]),
    broadcast: (...args) => void calls.push(['all', ...args]),
  };
  return { controller: new RealtimeCommandsController(gateway), calls };
}

describe('RealtimeCommandsController', () => {
  it('delivers valid commands to the gateway', () => {
    const { controller, calls } = setup();
    controller.emitToGroup({
      group: 'trades',
      event: 'trade.created',
      data: { id: 'x', version: 1 },
    });
    controller.emitToClient({ socketId: 's-1', event: 'auth.expired', data: {} });
    controller.broadcast({ event: 'prices.ticked', data: { symbols: [], asOf: 'now' } });
    expect(calls).toEqual([
      ['group', 'trades', 'trade.created', { id: 'x', version: 1 }],
      ['client', 's-1', 'auth.expired', {}],
      ['all', 'prices.ticked', { symbols: [], asOf: 'now' }],
    ]);
  });

  it('drops commands with an unknown group or event', () => {
    const { controller, calls } = setup();
    controller.emitToGroup({ group: 'admins', event: 'trade.created', data: {} } as never);
    controller.emitToGroup({ group: 'trades', event: 'trade.deleted', data: {} } as never);
    controller.emitToClient({ socketId: 1, event: 'auth.expired', data: {} } as never);
    controller.broadcast({ event: 'nope', data: {} } as never);
    controller.emitToGroup(undefined as never);
    expect(calls).toEqual([]);
  });
});
