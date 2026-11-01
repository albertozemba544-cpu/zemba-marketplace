export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { readUnsubscribeToken } from '@/lib/unsubscribe';
import { fail, handleError } from '@/lib/http';

// POST (not GET) so that email scanners that open links cannot unsubscribe people by accident.
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const userId = readUnsubscribeToken(String(token || ''));
    if (!userId) return fail('This link is not valid', 400);
    await execute('UPDATE users SET newsletter_opt_in = false WHERE id = $1', [userId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
