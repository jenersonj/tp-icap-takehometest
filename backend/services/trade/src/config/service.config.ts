import { z } from 'zod';

const ServiceEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().min(1).default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: z.string().min(1).default('blotter'),
  /** Random trades generated on first start when the trades table is empty (0 disables). */
  SEED_TRADE_COUNT: z.coerce.number().int().min(0).max(1000).default(500),
  /** Mock market ticker interval (0 disables it). */
  PRICE_TICK_MS: z.coerce.number().int().min(0).max(60_000).default(2000),
});

export type ServiceConfig = z.infer<typeof ServiceEnvSchema>;

/** Validates the environment once at startup and fails fast with every problem listed. */
export function loadServiceConfig(env: NodeJS.ProcessEnv = process.env): ServiceConfig {
  const result = ServiceEnvSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid service configuration: ${problems}`);
  }
  return result.data;
}

export const SERVICE_CONFIG = Symbol('SERVICE_CONFIG');
