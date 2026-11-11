import { z } from 'zod';

const ApiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  RABBITMQ_URL: z.string().min(1).default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: z.string().min(1).default('blotter'),
  /** RPC timeout towards the service (ARCHITECTURE.md: 5 s). */
  RPC_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  /** Secure flag on the auth cookies; defaults to on in production. */
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
});

export type ApiConfig = Omit<z.infer<typeof ApiEnvSchema>, 'COOKIE_SECURE'> & {
  COOKIE_SECURE: boolean;
};

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const result = ApiEnvSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid API configuration: ${problems}`);
  }
  const { COOKIE_SECURE, ...rest } = result.data;
  return {
    ...rest,
    COOKIE_SECURE: COOKIE_SECURE ? COOKIE_SECURE === 'true' : rest.NODE_ENV === 'production',
  };
}

export const API_CONFIG = Symbol('API_CONFIG');
