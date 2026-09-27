import express, { RequestHandler } from 'express';
import request from 'supertest';
import { createApiLimiter, createAuthLimiter } from '../../middleware/rateLimit';

const appWith = (limiter: RequestHandler): express.Application => {
  const app = express();
  app.use(limiter);
  app.get('/ping', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
};

const hit = async (app: express.Application, times: number): Promise<number[]> => {
  const statuses: number[] = [];
  for (let i = 0; i < times; i++) {
    statuses.push((await request(app).get('/ping')).status);
  }
  return statuses;
};

describe('rate limiting', () => {
  it('limits the API per RATE_LIMIT_MAX_REQUESTS and returns 429 JSON', async () => {
    const app = appWith(
      createApiLimiter({ NODE_ENV: 'development', RATE_LIMIT_MAX_REQUESTS: '3' })
    );

    expect(await hit(app, 3)).toEqual([200, 200, 200]);
    const blocked = await request(app).get('/ping').expect(429);
    expect(blocked.body).toEqual({
      success: false,
      message: 'Too many requests, please try again later.',
    });
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('defaults the auth limiter to 10 requests per window', async () => {
    const app = appWith(createAuthLimiter({ NODE_ENV: 'production' }));

    const statuses = await hit(app, 11);
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
  });

  it('uses AUTH_RATE_LIMIT_MAX_REQUESTS and ignores invalid values', async () => {
    const custom = appWith(
      createAuthLimiter({ NODE_ENV: 'development', AUTH_RATE_LIMIT_MAX_REQUESTS: '2' })
    );
    expect(await hit(custom, 3)).toEqual([200, 200, 429]);

    const invalid = appWith(
      createApiLimiter({ NODE_ENV: 'development', RATE_LIMIT_MAX_REQUESTS: 'abc' })
    );
    // Falls back to the default of 100
    expect(await hit(invalid, 5)).toEqual([200, 200, 200, 200, 200]);
  });

  it('is disabled when NODE_ENV=test', async () => {
    const app = appWith(createAuthLimiter({ NODE_ENV: 'test', AUTH_RATE_LIMIT_MAX_REQUESTS: '1' }));
    expect(await hit(app, 3)).toEqual([200, 200, 200]);
  });
});
