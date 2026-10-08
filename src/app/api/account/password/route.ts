export const dynamic = 'force-dynamic';

import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';

// Change your password while logged in. The current password must be right.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    const { current_password, new_password } = await req.json();
    if (typeof current_password !== 'string' || typeof new_password !== 'string') return fail('Please fill in both passwords');
    if (new_password.length < 8) return fail('The new password must be at least 8 characters');

    const row = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [auth.user.id]);
    if (!row || !(await bcrypt.compare(current_password, row.password_hash))) return fail('Your current password is not correct', 403);

    await queryOne('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(new_password, 10), auth.user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
