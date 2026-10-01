export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { subject, body, audience } = await req.json();
    if (!subject?.trim() || !body?.trim()) return fail('Subject and message are required');

    const saved = await queryOne<{ id: string }>(
      'INSERT INTO announcements (subject, body, audience) VALUES ($1, $2, $3) RETURNING id',
      [String(subject).trim().slice(0, 255), String(body).trim(), audience || 'ALL']
    );
    const recipients = await queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM users WHERE newsletter_opt_in = true AND account_status = 'ACTIVE'"
    );
    return NextResponse.json({ ok: true, id: saved?.id, recipientCount: recipients?.count ?? 0 }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
