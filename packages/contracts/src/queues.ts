/**
 * RabbitMQ queue names. Each domain service consumes its RPC patterns from its own queue
 * (routing is by pattern on the topic exchange, so splitting a module into a new service
 * only means a new queue). Realtime consumes emit commands from REALTIME_COMMANDS.
 */
export const Queues = {
  TRADE_SERVICE_RPC: 'blotter.trade-service.rpc',
  REALTIME_COMMANDS: 'blotter.realtime.commands',
} as const;
export type QueueName = (typeof Queues)[keyof typeof Queues];
