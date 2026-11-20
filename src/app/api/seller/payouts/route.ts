export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleError } from '@/lib/http';
import { allocateDeductions, sellerChargeOwed } from '@/lib/sellerCharges';

// The seller's own money summary and per-order payout history.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  try {
    const summary = await queryOne<{ in_escrow: number; awaiting: number; paid: number }>(
      `SELECT
         COALESCE(SUM(net_amount) FILTER (WHERE status IN ('FUNDS_SECURED', 'DISPATCHED', 'PENDING_ADMIN_REVIEW', 'DISPUTED')), 0) AS in_escrow,
         COALESCE(SUM(net_amount) FILTER (WHERE status = 'COMPLETED' AND payout_status = 'DUE'), 0) AS awaiting,
         COALESCE(SUM(net_amount) FILTER (WHERE payout_status = 'PAID'), 0) AS paid
       FROM orders WHERE seller_id = $1`,
      [auth.user.id]
    );
    const orders = await query(
      `SELECT o.order_reference, o.amount, o.platform_fee, o.net_amount, o.status, o.payout_status,
              o.payout_reference, o.payout_paid_at, o.created_at, o.updated_at, p.title,
              COALESCE((SELECT SUM((e.payload->>'amount')::numeric) FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'SELLER_CHARGE_DEDUCTED'), 0) AS deduction
       FROM orders o LEFT JOIN products p ON p.id = o.product_id
       WHERE o.seller_id = $1 AND o.status <> 'PENDING_PAYMENT'
       ORDER BY o.updated_at DESC LIMIT 200`,
      [auth.user.id]
    );
    // refund charges still to be taken off upcoming payouts, and how much of each due payout they will use
    const owed = await sellerChargeOwed(auth.user.id);
    const planned = owed > 0 ? await allocateDeductions(auth.user.id) : new Map<string, number>();
    const dueIds = owed > 0
      ? await query<{ id: string; order_reference: string }>(`SELECT id, order_reference FROM orders WHERE seller_id = $1 AND status = 'COMPLETED' AND payout_status = 'DUE'`, [auth.user.id])
      : [];
    const plannedByRef = new Map<string, number>();
    for (const row of dueIds) if (planned.has(row.id)) plannedByRef.set(row.order_reference, planned.get(row.id) as number);
    const withDeductions = (orders as any[]).map((o) => ({
      ...o,
      deduction: o.payout_status === 'DUE' ? plannedByRef.get(o.order_reference) || 0 : Number(o.deduction),
    }));
    return NextResponse.json({
      summary: summary ?? { in_escrow: 0, awaiting: 0, paid: 0 },
      charges_owed: owed,
      orders: withDeductions,
      payout_to: { provider: auth.user.momo_provider, number: auth.user.momo_number },
    });
  } catch (error) {
    return handleError(error);
  }
}
