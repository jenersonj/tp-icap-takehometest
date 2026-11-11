import { ApiBody } from '@nestjs/swagger';
import { z } from 'zod';

/** Documents a request body in Swagger from the same zod schema that validates it. */
export const ApiZodBody = (schema: z.ZodType) =>
  ApiBody({
    schema: z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<
      string,
      unknown
    >,
  });
