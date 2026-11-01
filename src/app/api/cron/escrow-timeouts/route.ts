export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processEscrowTimeouts } from '@/workers/escrowTimeout';
import { execute, query, logEvent } from '@/lib/db';
import { alertAdmin } from '@/lib/alerts';
import { handleError } from '@/lib/http';

// Vercel Cron calls this daily and sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await processEscrowTimeouts();
    await execute("DELETE FROM rate_limits WHERE bucket < now() - interval '2 days'").catch(() => 0);
    // Disputes that nobody settled for 7 days go to the admin for a decision
    const stale = await query<{ order_id: string }>(
      "UPDATE disputes SET stage = 'ESCALATED', escalated_at = now() WHERE status = 'OPEN' AND escalated_at IS NULL AND created_at < now() - interval '7 days' RETURNING order_id"
    ).catch(() => [] as { order_id: string }[]);
    for (const row of stale) await logEvent(row.order_id, 'DISPUTE_ESCALATED', { reason: 'No agreement after 7 days' }).catch(() => null);
    if (stale.length) await alertAdmin('Disputes need a decision', `${stale.length} dispute(s) were not settled in 7 days. Open Admin -> Disputes.`).catch(() => null);
    return NextResponse.json({ ...result, disputesEscalated: stale.length });
  } catch (error) {
    return handleError(error);
  }
}
