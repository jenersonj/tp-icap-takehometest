import { z } from 'zod';

const RealtimeEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  RABBITMQ_URL: z.string().min(1).default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: z.string().min(1).default('blotter'),
  /** Origins allowed to open a socket (comma separated). The web proxies /socket.io, so same-origin by default. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:8080')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

export type RealtimeConfig = z.infer<typeof RealtimeEnvSchema>;

export function loadRealtimeConfig(env: NodeJS.ProcessEnv = process.env): RealtimeConfig {
  const result = RealtimeEnvSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid realtime configuration: ${problems}`);
  }
  return result.data;
}

export const REALTIME_CONFIG = Symbol('REALTIME_CONFIG');
