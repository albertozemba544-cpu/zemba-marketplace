// One-time links for "verify your email" and "reset your password".
// Only a hash of each token is stored, so a leaked database cannot be used to take over accounts.

import crypto from 'crypto';
import { execute, queryOne } from './db';

export type TokenType = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

/** Creates a token and returns the raw value to put in the email link. */
export async function createToken(userId: string, type: TokenType, ttlMinutes: number): Promise<string> {
  const raw = crypto.randomBytes(32).toString('base64url');
  await execute(
    `INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(mins => $4::int))`,
    [userId, type, hashToken(raw), ttlMinutes]
  );
  return raw;
}

/** True if a token for this user was created in the last `seconds` seconds (stops email spam). */
export async function recentTokenExists(userId: string, type: TokenType, seconds: number): Promise<boolean> {
  const row = await queryOne(
    `SELECT 1 AS found FROM auth_tokens
     WHERE user_id = $1 AND type = $2 AND created_at > now() - make_interval(secs => $3::int) LIMIT 1`,
    [userId, type, seconds]
  );
  return Boolean(row);
}

/** Marks a token as used and returns the user it belongs to, or null if it is wrong, expired or already used. */
export async function consumeToken(raw: string, type: TokenType): Promise<string | null> {
  if (!raw || raw.length < 20 || raw.length > 100) return null;
  const row = await queryOne<{ user_id: string }>(
    `UPDATE auth_tokens SET used_at = now()
     WHERE token_hash = $1 AND type = $2 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [hashToken(raw), type]
  );
  return row?.user_id ?? null;
}
