export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { settleDispute } from '@/lib/disputes';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const disputes = await query<any>(`
      SELECT d.*, o.order_reference, o.amount, o.status AS order_status, o.admin_hold
      FROM disputes d JOIN orders o ON o.id = d.order_id
      ORDER BY (d.status = 'OPEN' AND d.escalated_at IS NOT NULL) DESC, d.created_at DESC`);

    const ids = disputes.map((d) => d.id);
    const messages = ids.length
      ? await query<any>(
          `SELECT m.id, m.dispute_id, m.sender_id, m.message, m.created_at, u.full_name, u.role AS sender_role
           FROM dispute_messages m JOIN users u ON u.id = m.sender_id
           WHERE m.dispute_id = ANY($1::uuid[]) ORDER BY m.created_at ASC`,
          [ids]
        )
      : [];
    const proposals = ids.length
      ? await query<any>(
          `SELECT p.dispute_id, p.kind, p.note, p.status, p.created_at, u.role AS proposer_role
           FROM dispute_proposals p JOIN users u ON u.id = p.proposed_by
           WHERE p.dispute_id = ANY($1::uuid[]) ORDER BY p.created_at ASC`,
          [ids]
        )
      : [];
    const withExtras = disputes.map((d) => ({
      ...d,
      messages: messages.filter((m) => m.dispute_id === d.id),
      proposals: proposals.filter((p) => p.dispute_id === d.id),
    }));
    return NextResponse.json({ disputes: withExtras });
  } catch (error) {
    return handleError(error);
  }
}

// Last resort: the admin decides when the buyer and seller could not agree. Refund the buyer or pay the seller.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { dispute_id, resolution, admin_notes } = await req.json();
    if (!isUuid(dispute_id) || !['refund', 'release'].includes(resolution)) {
      return fail('Dispute ID and a valid resolution are required');
    }
    const dispute = await queryOne<any>('SELECT id, status FROM disputes WHERE id = $1', [dispute_id]);
    if (!dispute) return fail('Dispute not found', 404);
    if (dispute.status !== 'OPEN') return fail('This dispute has already been resolved', 409);

    const done = await settleDispute(dispute_id, resolution, 'ADMIN', String(admin_notes || ''));
    if (!done) return fail('This dispute has already been resolved', 409);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
