import {
  AuditPatterns,
  AuthPatterns,
  ErrorCode,
  PositionPatterns,
  PricePatterns,
  TradePatterns,
  type Actor,
  type AuthTokensRecord,
  type RpcMap,
  type TradeRecord,
} from '@blotter/contracts';
import { CodedError, InMemoryMessageBus, TypedMessageBus } from '@blotter/messaging';

export const trader: Actor = {
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'jsmith',
  traderCode: 'JSMITH',
  role: 'TRADER',
  books: ['EQUITIES_US'],
};

export const tradeId = '22222222-2222-4222-8222-222222222222';

export const tradeRecord: TradeRecord = {
  id: tradeId,
  tradeRef: 'TRD-100001',
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 300,
  price: '227.455',
  trader: 'JSMITH',
  book: 'EQUITIES_US',
  counterparty: 'Citi',
  tradeTimestamp: '2026-11-11T09:00:00.000Z',
  status: 'ACTIVE',
  version: 1,
  createdAt: '2026-11-11T09:00:00.000Z',
  updatedAt: '2026-11-11T09:00:00.000Z',
  createdById: trader.userId,
};

const tokens = (n: number): AuthTokensRecord => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  accessTokenExpiresAt: '2026-11-11T10:15:00.000Z',
  refreshTokenExpiresAt: '2026-11-18T10:00:00.000Z',
  user: {
    id: trader.userId,
    username: trader.username,
    traderCode: trader.traderCode,
    role: trader.role,
    books: trader.books,
  },
});

/** A stand-in for the service: answers each RPC and records the payloads it got. */
export function fakeService() {
  const bus = new InMemoryMessageBus();
  const rpc = new TypedMessageBus<RpcMap>(bus);
  const calls: { pattern: string; payload: unknown }[] = [];
  const unauthenticated = () => new CodedError(ErrorCode.UNAUTHENTICATED, 'Session expired');
  let issued = 0;

  const record = <P>(pattern: string, payload: P) => {
    calls.push({ pattern, payload });
  };

  rpc.handle(AuthPatterns.LOGIN, async (req) => {
    record(AuthPatterns.LOGIN, req);
    if (req.password !== 'password123') {
      throw new CodedError(ErrorCode.UNAUTHENTICATED, 'Invalid username or password');
    }
    return tokens(++issued);
  });
  rpc.handle(AuthPatterns.REFRESH, async (req) => {
    record(AuthPatterns.REFRESH, req);
    if (!req.refreshToken.startsWith('refresh-')) throw unauthenticated();
    return tokens(++issued);
  });
  rpc.handle(AuthPatterns.LOGOUT, async (req) => {
    record(AuthPatterns.LOGOUT, req);
    return { revoked: true };
  });
  rpc.handle(AuthPatterns.VERIFY_ACCESS_TOKEN, async (req) => {
    if (!req.accessToken.startsWith('access-')) throw unauthenticated();
    return { actor: trader, expiresAt: '2026-11-11T10:15:00.000Z' };
  });
  rpc.handle(AuthPatterns.ISSUE_SOCKET_TICKET, async (req) => {
    record(AuthPatterns.ISSUE_SOCKET_TICKET, req);
    return { ticket: 'ticket-1', expiresAt: '2026-11-11T10:00:30.000Z' };
  });
  rpc.handle(TradePatterns.LIST, async (req) => {
    record(TradePatterns.LIST, req);
    return { items: [tradeRecord], total: 1, page: req.page, pageSize: req.pageSize };
  });
  rpc.handle(TradePatterns.GET, async (req) => {
    if (req.id !== tradeId)
      throw new CodedError(ErrorCode.NOT_FOUND, `Trade ${req.id} was not found`);
    return tradeRecord;
  });
  rpc.handle(TradePatterns.CREATE, async (req) => {
    record(TradePatterns.CREATE, req);
    return { ...tradeRecord, ...req.input, price: String(req.input.price) };
  });
  rpc.handle(TradePatterns.AMEND, async (req) => {
    record(TradePatterns.AMEND, req);
    if (req.version !== 1) {
      throw new CodedError(ErrorCode.VERSION_CONFLICT, 'The trade was changed by someone else');
    }
    return { ...tradeRecord, quantity: req.changes.quantity ?? tradeRecord.quantity, version: 2 };
  });
  rpc.handle(TradePatterns.CANCEL, async (req) => {
    record(TradePatterns.CANCEL, req);
    return { ...tradeRecord, status: 'CANCELLED', version: 2 };
  });
  rpc.handle(AuditPatterns.LIST_FOR_TRADE, async () => [
    {
      id: 'a-1',
      tradeId,
      action: 'CREATED',
      version: 1,
      before: null,
      after: { symbol: 'AAPL', quantity: 300 },
      changed: [],
      actorId: trader.userId,
      actorName: 'JSMITH',
      reason: null,
      at: '2026-11-11T09:00:00.000Z',
    },
    {
      id: 'a-2',
      tradeId,
      action: 'AMENDED',
      version: 2,
      before: { symbol: 'AAPL', quantity: 300 },
      after: { symbol: 'AAPL', quantity: 400 },
      changed: ['quantity'],
      actorId: trader.userId,
      actorName: 'JSMITH',
      reason: null,
      at: '2026-11-11T09:05:00.000Z',
    },
  ]);
  rpc.handle(PositionPatterns.LIST, async (req) => {
    record(PositionPatterns.LIST, req);
    return [
      {
        symbol: 'AAPL',
        netQuantity: 60,
        averagePrice: '10',
        lastPrice: '12.5',
        priceAsOf: '2026-11-11T10:00:00.000Z',
        marketValue: '750',
        unrealisedPnl: '150',
        realisedPnl: '200',
        tradeCount: 3,
      },
      {
        symbol: 'MSFT',
        netQuantity: 5,
        averagePrice: '3',
        lastPrice: null,
        priceAsOf: null,
        marketValue: null,
        unrealisedPnl: null,
        realisedPnl: '-0.5',
        tradeCount: 1,
      },
    ];
  });
  rpc.handle(PricePatterns.LIST, async (req) => {
    record(PricePatterns.LIST, req);
    return [{ symbol: 'AAPL', price: '227.45', asOf: '2026-11-11T10:00:00.000Z' }];
  });

  return { bus, calls };
}
