export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Sends the next small batch of an update. The admin page keeps calling this until nobody is left.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { buildUpdateEmail } from '@/lib/broadcast';
import { sendEmail } from '@/lib/notify';
import { fail, handleError, isUuid } from '@/lib/http';

const BATCH = 12;

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { broadcast_id } = await req.json();
    if (!isUuid(broadcast_id)) return fail('Invalid request');
    const broadcast = await queryOne<any>('SELECT * FROM broadcasts WHERE id = $1', [broadcast_id]);
    if (!broadcast) return fail('Not found', 404);

    // claim a batch so two open pages cannot send the same email twice
    const batch = await query<any>(
      `UPDATE broadcast_recipients SET status = 'SENDING'
       WHERE (broadcast_id, user_id) IN (
         SELECT broadcast_id, user_id FROM broadcast_recipients WHERE broadcast_id = $1 AND status = 'PENDING' LIMIT ${BATCH} FOR UPDATE SKIP LOCKED
       ) RETURNING user_id, email, full_name`,
      [broadcast_id]
    );
    let sent = 0;
    let failed = 0;
    for (const r of batch) {
      const ok = await sendEmail(r.email, broadcast.subject, buildUpdateEmail(broadcast, r));
      await queryOne(
        'UPDATE broadcast_recipients SET status = $3, error = $4, sent_at = CASE WHEN $3 = \'SENT\' THEN now() ELSE NULL END WHERE broadcast_id = $1 AND user_id = $2',
        [broadcast_id, r.user_id, ok ? 'SENT' : 'FAILED', ok ? null : 'The email provider refused it (daily limit or a bad address)']
      );
      if (ok) sent++; else failed++;
    }
    const totals = await queryOne<any>(
      `SELECT COUNT(*) FILTER (WHERE status = 'SENT') AS sent, COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
              COUNT(*) FILTER (WHERE status IN ('PENDING', 'SENDING')) AS remaining
       FROM broadcast_recipients WHERE broadcast_id = $1`,
      [broadcast_id]
    );
    await queryOne('UPDATE broadcasts SET sent = $2, failed = $3, status = $4 WHERE id = $1', [broadcast_id, totals.sent, totals.failed, totals.remaining === 0 ? 'DONE' : 'SENDING']);
    return NextResponse.json({ ok: true, sent: totals.sent, failed: totals.failed, remaining: totals.remaining, batch_sent: sent, batch_failed: failed });
  } catch (error) {
    return handleError(error);
  }
}
