export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, withTransaction, logEvent } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notifySettlement, settleOrder } from '@/lib/orders';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const disputes = await query<any>(`
      SELECT d.*, o.order_reference, o.amount, o.status AS order_status
      FROM disputes d JOIN orders o ON o.id = d.order_id
      ORDER BY d.created_at DESC`);

    const ids = disputes.map((d) => d.id);
    const messages = ids.length
      ? await query<any>(
          `SELECT m.id, m.dispute_id, m.sender_id, m.message, m.created_at, u.full_name, u.role AS sender_role
           FROM dispute_messages m JOIN users u ON u.id = m.sender_id
           WHERE m.dispute_id = ANY($1::uuid[]) ORDER BY m.created_at ASC`,
          [ids]
        )
      : [];
    const withMessages = disputes.map((d) => ({ ...d, messages: messages.filter((m) => m.dispute_id === d.id) }));
    return NextResponse.json({ disputes: withMessages });
  } catch (error) {
    return handleError(error);
  }
}

// Admin resolves a dispute: refund the buyer or release the money to the seller.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { dispute_id, resolution, admin_notes } = await req.json();
    if (!isUuid(dispute_id) || !['refund', 'release'].includes(resolution)) {
      return fail('Dispute ID and a valid resolution are required');
    }

    const dispute = await queryOne<any>('SELECT * FROM disputes WHERE id = $1', [dispute_id]);
    if (!dispute) return fail('Dispute not found', 404);
    if (dispute.status !== 'OPEN') return fail('This dispute has already been resolved', 409);

    const disputeStatus = resolution === 'refund' ? 'RESOLVED_REFUND' : 'RESOLVED_RELEASE';

    const settled = await withTransaction(async (client) => {
      const order = await settleOrder(client, dispute.order_id, resolution);
      await client.query(
        'UPDATE disputes SET status = $1, admin_notes = $2, resolved_at = now() WHERE id = $3',
        [disputeStatus, String(admin_notes || '').slice(0, 2000), dispute_id]
      );
      await logEvent(dispute.order_id, 'DISPUTE_RESOLVED', { resolution, admin_notes }, client);
      return order;
    });
    if (settled) await notifySettlement(settled, resolution);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
