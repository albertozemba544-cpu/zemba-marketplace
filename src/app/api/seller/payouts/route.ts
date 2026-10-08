export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleError } from '@/lib/http';

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
              o.payout_reference, o.payout_paid_at, o.created_at, o.updated_at, p.title
       FROM orders o LEFT JOIN products p ON p.id = o.product_id
       WHERE o.seller_id = $1 AND o.status <> 'PENDING_PAYMENT'
       ORDER BY o.updated_at DESC LIMIT 200`,
      [auth.user.id]
    );
    return NextResponse.json({
      summary: summary ?? { in_escrow: 0, awaiting: 0, paid: 0 },
      orders,
      payout_to: { provider: auth.user.momo_provider, number: auth.user.momo_number },
    });
  } catch (error) {
    return handleError(error);
  }
}
