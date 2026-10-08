export const dynamic = 'force-dynamic';

// "Money to move": seller payouts and buyer refunds that still have to be sent by mobile money.
// Until a payment gateway is connected, the admin sends them by hand and then marks them as paid here.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, logEvent } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createNotification } from '@/lib/orders';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const payouts = await query(
      `SELECT o.id, o.order_reference, o.amount, o.platform_fee, o.net_amount, o.updated_at, p.title,
              COALESCE(s.business_name, s.full_name) AS seller_name, s.momo_provider, s.momo_number
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       JOIN users s ON s.id = o.seller_id
       WHERE o.status = 'COMPLETED' AND o.payout_status = 'DUE'
       ORDER BY o.updated_at ASC`
    );
    const refunds = await query(
      `SELECT o.id, o.order_reference, o.amount, o.updated_at, p.title,
              b.full_name AS buyer_name, b.phone_number AS buyer_phone
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       JOIN users b ON b.id = o.customer_id
       WHERE o.status = 'REFUNDED' AND o.refund_status = 'DUE'
       ORDER BY o.updated_at ASC`
    );
    const recent = await query(
      `SELECT o.order_reference, o.net_amount, o.amount, o.payout_status, o.payout_reference, o.payout_paid_at,
              o.refund_status, o.refund_reference, o.refund_paid_at
       FROM orders o
       WHERE o.payout_status = 'PAID' OR o.refund_status = 'PAID'
       ORDER BY GREATEST(o.payout_paid_at, o.refund_paid_at) DESC NULLS LAST LIMIT 30`
    );
    return NextResponse.json({ payouts, refunds, recent });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { order_id, kind, reference } = await req.json();
    const ref = String(reference || '').trim().slice(0, 100);
    if (!isUuid(order_id) || !['payout', 'refund'].includes(kind)) return fail('A valid order and type are required');
    if (!ref) return fail('Enter the mobile money transaction reference so there is a record of the payment');

    const order = await queryOne<{ id: string; customer_id: string | null; seller_id: string | null }>(
      kind === 'payout'
        ? `UPDATE orders SET payout_status = 'PAID', payout_reference = $1, payout_paid_at = now()
           WHERE id = $2 AND status = 'COMPLETED' AND payout_status = 'DUE' RETURNING id, customer_id, seller_id`
        : `UPDATE orders SET refund_status = 'PAID', refund_reference = $1, refund_paid_at = now()
           WHERE id = $2 AND status = 'REFUNDED' AND refund_status = 'DUE' RETURNING id, customer_id, seller_id`,
      [ref, order_id]
    );
    if (!order) return fail('This payment was already marked as sent, or the order was not found', 409);

    await logEvent(order.id, kind === 'payout' ? 'PAYOUT_SENT' : 'REFUND_SENT', { reference: ref, admin_id: auth.user.id });
    if (kind === 'payout' && order.seller_id) await createNotification(order.id, order.seller_id, 'PAYOUT_SENT', undefined, ref).catch(() => null);
    if (kind === 'refund' && order.customer_id) await createNotification(order.id, order.customer_id, 'REFUND_SENT', undefined, ref).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
