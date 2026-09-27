import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export const DEFAULT_API_LIMIT = 100;
export const DEFAULT_AUTH_LIMIT = 10;

const readPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const createLimiter = (
  windowMs: number,
  limit: number,
  env: NodeJS.ProcessEnv
): RateLimitRequestHandler => {
  // Limits are off under NODE_ENV=test so the Jest suite is never throttled
  const disabled = env.NODE_ENV === 'test';
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => disabled,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
};

/**
 * General limit for every /api route, per client IP.
 * RATE_LIMIT_WINDOW_MS (default 15 min) and RATE_LIMIT_MAX_REQUESTS (default 100).
 */
export const createApiLimiter = (env: NodeJS.ProcessEnv = process.env): RateLimitRequestHandler =>
  createLimiter(
    readPositiveInt(env.RATE_LIMIT_WINDOW_MS, FIFTEEN_MINUTES_MS),
    readPositiveInt(env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_API_LIMIT),
    env
  );

/**
 * Stricter limit for credential endpoints (signup, signin, dev-login, verify), per client IP.
 * AUTH_RATE_LIMIT_WINDOW_MS (default: RATE_LIMIT_WINDOW_MS, else 15 min) and
 * AUTH_RATE_LIMIT_MAX_REQUESTS (default 10).
 */
export const createAuthLimiter = (env: NodeJS.ProcessEnv = process.env): RateLimitRequestHandler =>
  createLimiter(
    readPositiveInt(
      env.AUTH_RATE_LIMIT_WINDOW_MS,
      readPositiveInt(env.RATE_LIMIT_WINDOW_MS, FIFTEEN_MINUTES_MS)
    ),
    readPositiveInt(env.AUTH_RATE_LIMIT_MAX_REQUESTS, DEFAULT_AUTH_LIMIT),
    env
  );

// Shared instances used by the routers. Created at import time, after src/config/database.ts
// has run dotenv.config().
export const apiLimiter = createApiLimiter();
export const authLimiter = createAuthLimiter();
