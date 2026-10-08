export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';

// Messages from the Contact page and from the help chat's "send a suggestion" box.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const messages = await query(
      `SELECT s.id, s.subject, s.message, s.status, s.created_at, u.full_name, u.email
       FROM suggestions s LEFT JOIN users u ON u.id = s.user_id
       ORDER BY (s.status = 'NEW') DESC, s.created_at DESC LIMIT 200`
    );
    return NextResponse.json({ messages });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { id, status } = await req.json();
    if (!isUuid(id) || !['NEW', 'DONE'].includes(status)) return fail('A valid message and status are required');
    await execute('UPDATE suggestions SET status = $1 WHERE id = $2', [status, id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
