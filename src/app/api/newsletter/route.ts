export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { optionalUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest) {
  try {
    const { email, subscribed } = await req.json();

    // A logged-in user changes their own preference.
    const current = await optionalUser(req);
    if (current) {
      await execute('UPDATE users SET newsletter_opt_in = $1 WHERE id = $2', [subscribed !== false, current.id]);
      return NextResponse.json({ ok: true });
    }

    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return fail('A valid email is required');
    const user = await queryOne<{ id: string }>('SELECT id FROM users WHERE lower(email) = lower($1)', [email.trim()]);
    if (!user) return fail('Create an account to receive Zemba updates', 404);
    await execute('UPDATE users SET newsletter_opt_in = true WHERE id = $1', [user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
