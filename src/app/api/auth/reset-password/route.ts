export const dynamic = 'force-dynamic';

import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { consumeToken } from '@/lib/tokens';
import { fail, handleError } from '@/lib/http';

// POST /api/auth/reset-password  { token, password }
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (typeof password !== 'string' || password.length < 8) return fail('Password must be at least 8 characters');

    const userId = await consumeToken(String(token || ''), 'RESET_PASSWORD');
    if (!userId) return fail('This link is invalid or has expired. Please ask for a new one.', 400);

    const hash = await bcrypt.hash(password, 10);
    // Using the emailed link also proves the person owns the inbox, so the email counts as confirmed.
    await execute('UPDATE users SET password_hash = $1, email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $2', [hash, userId]);
    // any other reset links that were still unused stop working
    await execute("UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND type = 'RESET_PASSWORD' AND used_at IS NULL", [userId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
