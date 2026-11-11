import type { RpcMap } from '@blotter/contracts';
import { MESSAGE_BUS, TypedMessageBus, type MessageBus } from '@blotter/messaging';
import { Inject, Injectable } from '@nestjs/common';

/** The API's only way to the service: typed request/reply over the MessageBus. */
@Injectable()
export class RpcClient extends TypedMessageBus<RpcMap> {
  constructor(@Inject(MESSAGE_BUS) bus: MessageBus) {
    super(bus);
  }
}
