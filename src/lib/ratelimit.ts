// Simple attempt limiter. It counts attempts per key in a time window (stored in the database).
// If the database check itself fails, the request is allowed (so a problem here never locks real people out).

import { NextRequest } from 'next/server';
import { queryOne } from './db';

export const TOO_MANY = 'Too many attempts. Please wait a few minutes and try again.';

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
  return ip.slice(0, 64);
}

/** true = allowed, false = too many attempts in this window */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
    const row = await queryOne<{ count: number }>(
      `INSERT INTO rate_limits (key, bucket, count) VALUES ($1, to_timestamp($2::double precision), 1)
       ON CONFLICT (key, bucket) DO UPDATE SET count = rate_limits.count + 1
       RETURNING count`,
      [key.slice(0, 200), bucket]
    );
    return (row?.count ?? 1) <= limit;
  } catch (error) {
    console.error('Attempt limiter failed (allowing the request):', error);
    return true;
  }
}
