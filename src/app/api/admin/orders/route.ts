export const dynamic = 'force-dynamic';

// Orders that the automatic timers could not settle (status PENDING_ADMIN_REVIEW).
// The admin looks at the seller's proof of dispatch and decides: pay the seller, or refund the buyer.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, withTransaction, logEvent } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notifySettlement, settleOrder } from '@/lib/orders';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const orders = await query(
      `SELECT o.id, o.order_reference, o.amount, o.net_amount, o.status, o.waybill_image_url, o.timeout_days,
              o.created_at, o.updated_at, p.title,
              COALESCE(s.business_name, s.full_name) AS seller_name, s.phone_number AS seller_phone,
              b.full_name AS buyer_name, b.phone_number AS buyer_phone
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN users s ON s.id = o.seller_id
       LEFT JOIN users b ON b.id = o.customer_id
       WHERE o.status = 'PENDING_ADMIN_REVIEW'
       ORDER BY o.updated_at ASC`
    );
    return NextResponse.json({ orders });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { order_id, resolution, notes } = await req.json();
    if (!isUuid(order_id) || !['release', 'refund'].includes(resolution)) {
      return fail('A valid order and decision are required');
    }
    const order = await queryOne<{ status: string }>('SELECT status FROM orders WHERE id = $1', [order_id]);
    if (!order) return fail('Order not found', 404);
    if (order.status !== 'PENDING_ADMIN_REVIEW') return fail('This order is not waiting for review', 409);

    const settled = await withTransaction(async (client) => {
      const result = await settleOrder(client, order_id, resolution);
      await logEvent(order_id, 'ADMIN_REVIEW_RESOLVED', { resolution, notes: String(notes || '').slice(0, 1000), admin_id: auth.user.id }, client);
      return result;
    });
    if (settled) await notifySettlement(settled, resolution);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
