import type { AuditPatterns } from './audit/patterns';
import type { AuditEntryRecord } from './audit/audit.response';
import type { ListAuditForTradeRequest } from './audit/audit.request';
import type { AuthPatterns } from './auth/patterns';
import type {
  IssueSocketTicketRequest,
  LoginRequest,
  LogoutRequest,
  RedeemSocketTicketRequest,
  RefreshRequest,
} from './auth/auth.request';
import type {
  AuthTokensRecord,
  RedeemedSocketTicketRecord,
  SocketTicketRecord,
} from './auth/auth.response';
import type { PositionPatterns } from './positions/patterns';
import type { ListPositionsRequest } from './positions/position.request';
import type { PositionRecord } from './positions/position.response';
import type { PricePatterns } from './prices/patterns';
import type { ListPricesRequest } from './prices/price.request';
import type { PriceRecord } from './prices/price.response';
import type { TradePatterns } from './trades/patterns';
import type {
  AmendTradeRequest,
  CancelTradeRequest,
  CreateTradeRequest,
  GetTradeRequest,
  ListTradesRequest,
} from './trades/trade.request';
import type { TradePage, TradeRecord } from './trades/trade.response';

/**
 * The RPC catalogue: every request/reply pattern the service answers, with its request
 * and reply types. `TypedMessageBus<RpcMap>` uses it so a caller cannot send the wrong
 * payload or misread the reply.
 */
export interface RpcMap {
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
}

export type RpcPattern = keyof RpcMap;
export type RpcRequest<P extends RpcPattern> = RpcMap[P]['request'];
export type RpcResponse<P extends RpcPattern> = RpcMap[P]['response'];
