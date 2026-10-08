export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';

// The logged-in person's own details. Email cannot be changed here (it would need to be confirmed again).
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    const row = await queryOne<any>(
      'SELECT id, role, full_name, email, phone_number, business_name, newsletter_opt_in, whatsapp_opt_in, email_verified_at FROM users WHERE id = $1',
      [auth.user.id]
    );
    return NextResponse.json({ ...row, email_verified: Boolean(row?.email_verified_at) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    const body = await req.json();
    const fullName = String(body.full_name || '').trim();
    const phone = String(body.phone_number || '').trim();
    if (fullName.length < 2 || fullName.length > 120) return fail('Please enter your full name');
    if (phone.length < 7 || phone.length > 20) return fail('Please enter a valid phone number');

    await queryOne(
      'UPDATE users SET full_name = $1, phone_number = $2, newsletter_opt_in = $3, whatsapp_opt_in = $4 WHERE id = $5',
      [fullName, phone, body.newsletter_opt_in === true, body.whatsapp_opt_in === true, auth.user.id]
    );
    return NextResponse.json({ ok: true, full_name: fullName });
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') return fail('That phone number is already used by another account', 409);
    return handleError(error);
  }
}
