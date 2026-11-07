export const dynamic = 'force-dynamic';

// "Email check" for the admin: shows what is set up, and sends a test email to the admin so you can see it works.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { emailStatus, sendEmailDetailed } from '@/lib/notify';
import { SITE, siteUrl } from '@/lib/site';
import { handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  return NextResponse.json(emailStatus());
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const me = await queryOne<{ email: string; full_name: string }>('SELECT email, full_name FROM users WHERE id = $1', [auth.user.id]);
    const result = await sendEmailDetailed(me!.email, `${SITE.name} email test`, {
      title: 'Your emails are working',
      lines: [`Hello ${(me!.full_name || '').split(' ')[0] || 'there'},`, `This is a test message from ${SITE.name}. If you can read it, password resets, order alerts and sold-out notices can reach people.`],
      buttonText: 'Open the website',
      buttonUrl: siteUrl(),
    });
    return NextResponse.json({ ...result, sent_to: me!.email });
  } catch (error) {
    return handleError(error);
  }
}
