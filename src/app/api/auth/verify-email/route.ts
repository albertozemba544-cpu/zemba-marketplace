export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { consumeToken } from '@/lib/tokens';
import { fail, handleError } from '@/lib/http';

// POST /api/auth/verify-email  { token }
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const userId = await consumeToken(String(token || ''), 'VERIFY_EMAIL');
    if (!userId) return fail('This link is invalid or has expired. Request a new one below.', 400);
    await execute('UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL', [userId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
