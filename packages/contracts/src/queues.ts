/**
 * RabbitMQ queue names. The service consumes RPC requests from SERVICE_RPC; realtime
 * consumes fire-and-forget emit commands from REALTIME_COMMANDS.
 */
export const Queues = {
  SERVICE_RPC: 'blotter.service.rpc',
  REALTIME_COMMANDS: 'blotter.realtime.commands',
} as const;
export type QueueName = (typeof Queues)[keyof typeof Queues];
