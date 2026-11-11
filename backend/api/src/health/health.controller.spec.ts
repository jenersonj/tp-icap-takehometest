import { SystemPatterns } from '@blotter/contracts';
import { InMemoryMessageBus, MessagingModule } from '@blotter/messaging';
import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { HealthController } from './health.controller';

async function appWith(bus: InMemoryMessageBus): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [MessagingModule.forRoot({ bus })],
    controllers: [HealthController],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  await app.init();
  return app;
}

describe('GET /api/v1/health', () => {
  let app: INestApplication | undefined;
  afterEach(async () => app?.close());

  it('is ok when the service answers the ping', async () => {
    const bus = new InMemoryMessageBus();
    bus.handle(SystemPatterns.PING, async () => ({ service: 'service', status: 'ok', at: 'now' }));
    app = await appWith(bus);
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'ok' });
  });

  it('is 503 when the service does not answer', async () => {
    app = await appWith(new InMemoryMessageBus());
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(503);
    expect(res.body).toMatchObject({ status: 'degraded', service: 'unreachable' });
  });
});
