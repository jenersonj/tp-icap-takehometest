import type { AuditPatterns } from './audit/patterns.js';
import type { AuditEntryRecord } from './audit/audit.response.js';
import type { ListAuditForTradeRequest } from './audit/audit.request.js';
import type { AuthPatterns } from './auth/patterns.js';
import type {
  IssueSocketTicketRequest,
  LoginRequest,
  LogoutRequest,
  RedeemSocketTicketRequest,
  RefreshRequest,
  VerifyAccessTokenRequest,
} from './auth/auth.request.js';
import type {
  AuthTokensRecord,
  RedeemedSocketTicketRecord,
  SocketTicketRecord,
  VerifiedAccessTokenRecord,
} from './auth/auth.response.js';
import type { PositionPatterns } from './positions/patterns.js';
import type { ListPositionsRequest } from './positions/position.request.js';
import type { PositionRecord } from './positions/position.response.js';
import type { PricePatterns } from './prices/patterns.js';
import type { ListPricesRequest } from './prices/price.request.js';
import type { PriceRecord } from './prices/price.response.js';
import type { PingResponse, SystemPatterns } from './system/index.js';
import type { TradePatterns } from './trades/patterns.js';
import type {
  AmendTradeRequest,
  CancelTradeRequest,
  CreateTradeRequest,
  GetTradeRequest,
  ListTradesRequest,
} from './trades/trade.request.js';
import type { TradePage, TradeRecord } from './trades/trade.response.js';

/**
 * The RPC catalogue: every request/reply pattern the service answers, with its request
 * and reply types. `TypedMessageBus<RpcMap>` uses it so a caller cannot send the wrong
 * payload or misread the reply.
 */
export interface RpcMap {
  [SystemPatterns.PING]: { request: Record<string, never>; response: PingResponse };
  [TradePatterns.LIST]: { request: ListTradesRequest; response: TradePage };
  [TradePatterns.GET]: { request: GetTradeRequest; response: TradeRecord };
  [TradePatterns.CREATE]: { request: CreateTradeRequest; response: TradeRecord };
  [TradePatterns.AMEND]: { request: AmendTradeRequest; response: TradeRecord };
  [TradePatterns.CANCEL]: { request: CancelTradeRequest; response: TradeRecord };
  [AuditPatterns.LIST_FOR_TRADE]: {
    request: ListAuditForTradeRequest;
    response: AuditEntryRecord[];
  };
  [PositionPatterns.LIST]: { request: ListPositionsRequest; response: PositionRecord[] };
  [PricePatterns.LIST]: { request: ListPricesRequest; response: PriceRecord[] };
  [AuthPatterns.LOGIN]: { request: LoginRequest; response: AuthTokensRecord };
  [AuthPatterns.REFRESH]: { request: RefreshRequest; response: AuthTokensRecord };
  [AuthPatterns.LOGOUT]: { request: LogoutRequest; response: { revoked: boolean } };
  [AuthPatterns.ISSUE_SOCKET_TICKET]: {
    request: IssueSocketTicketRequest;
    response: SocketTicketRecord;
  };
  [AuthPatterns.REDEEM_SOCKET_TICKET]: {
    request: RedeemSocketTicketRequest;
    response: RedeemedSocketTicketRecord;
  };
  [AuthPatterns.VERIFY_ACCESS_TOKEN]: {
    request: VerifyAccessTokenRequest;
    response: VerifiedAccessTokenRecord;
  };
}

export type RpcPattern = keyof RpcMap;
export type RpcRequest<P extends RpcPattern> = RpcMap[P]['request'];
export type RpcResponse<P extends RpcPattern> = RpcMap[P]['response'];
