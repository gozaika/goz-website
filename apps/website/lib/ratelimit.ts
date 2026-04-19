/**
 * @file apps/website/lib/ratelimit.ts
 * @description Upstash Redis sliding-window rate limiter for public API routes.
 */

import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function createLimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'gozaika',
  });
}

/**
 * Executes per-endpoint rate limiting for an incoming request.
 *
 * @param req - Next.js request object.
 * @param identifier - Endpoint identifier used in Redis key names.
 * @returns Null when allowed, otherwise a ready-to-return 429 response.
 */
export async function checkRateLimit(
  req: NextRequest,
  identifier: string,
): Promise<Response | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const limiter = createLimiter();
  if (!limiter) return null;

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1';

  const key = `${identifier}:${ip}`;
  const result = await limiter.limit(key);

  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

    return Response.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  return null;
}
