import { AuthPatterns, type RedeemedSocketTicketRecord, type RpcMap } from '@blotter/contracts';
import { MESSAGE_BUS, TypedMessageBus, type MessageBus } from '@blotter/messaging';
import { Inject, Injectable } from '@nestjs/common';

/** Turns a handshake ticket into a session; throws when the service refuses it. */
export interface TicketRedeemer {
  redeem(ticket: string): Promise<RedeemedSocketTicketRecord>;
}

export const TICKET_REDEEMER = Symbol('TICKET_REDEEMER');

/** Redeems with the service's auth module over the bus (auth.redeemSocketTicket). */
@Injectable()
export class BusTicketRedeemer implements TicketRedeemer {
  private readonly rpc: TypedMessageBus<RpcMap>;

  constructor(@Inject(MESSAGE_BUS) bus: MessageBus) {
    this.rpc = new TypedMessageBus<RpcMap>(bus);
  }

  redeem(ticket: string): Promise<RedeemedSocketTicketRecord> {
    return this.rpc.request(AuthPatterns.REDEEM_SOCKET_TICKET, { ticket });
  }
}
