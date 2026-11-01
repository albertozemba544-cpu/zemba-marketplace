export const dynamic = 'force-dynamic';

// An email from the admin to one person (for example: why an account was suspended).

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { buildPersonalEmail } from '@/lib/broadcast';
import { isEmailConfigured, sendEmail } from '@/lib/notify';
import { fail, handleError, isUuid } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { user_id, subject, body } = await req.json();
    const title = String(subject || '').trim();
    const text = String(body || '').trim();
    if (!isUuid(user_id)) return fail('Choose who the email is for');
    if (title.length < 3 || title.length > 150) return fail('Write a subject (3 to 150 characters)');
    if (text.length < 5 || text.length > 5000) return fail('Write your message');
    if (!isEmailConfigured()) return fail('Email is not set up yet. Add the Brevo settings in Vercel first.', 503);

    const user = await queryOne<{ email: string; full_name: string }>('SELECT email, full_name FROM users WHERE id = $1', [user_id]);
    if (!user) return fail('User not found', 404);
    const delivered = await sendEmail(user.email, title, buildPersonalEmail(title, text, user.full_name));
    await queryOne('INSERT INTO admin_messages (to_user_id, to_email, subject, body, delivered, sent_by) VALUES ($1, $2, $3, $4, $5, $6)', [user_id, user.email, title, text, delivered, auth.user.id]);
    return delivered ? NextResponse.json({ ok: true }) : fail('The email provider did not accept the message. Try again later.', 502);
  } catch (error) {
    return handleError(error);
  }
}
