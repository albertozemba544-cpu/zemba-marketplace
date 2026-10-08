export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrderByReference, logEvent, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createNotification } from '@/lib/orders';
import { fail, handleError } from '@/lib/http';

// Buyer confirms delivery with the delivery code, which releases the money to the seller.
export async function POST(req: NextRequest, { params }: { params: { reference: string } }) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? '').trim();

    const order = await getOrderByReference(params.reference);
    if (!order || order.customer_id !== auth.user.id) return fail('Order not found', 404);
    if (order.status !== 'FUNDS_SECURED' && order.status !== 'DISPATCHED') {
      return fail(`Cannot release from status ${order.status}`, 400);
    }
    if (!order.delivery_code || code !== order.delivery_code) return fail('Incorrect delivery code', 400);

    const released = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE orders SET status = 'COMPLETED', payout_status = 'DUE', updated_at = now()
         WHERE id = $1 AND status IN ('FUNDS_SECURED', 'DISPATCHED')`,
        [order.id]
      );
      if (updated.rowCount === 0) return false;
      await logEvent(order.id, 'COMPLETED', { released_by: 'buyer_confirmation' }, client);
      return true;
    });
    if (!released) return fail('This order was already updated', 409);

    if (order.seller_id) await createNotification(order.id, order.seller_id, 'DELIVERY_CONFIRMED').catch(() => null);
    await createNotification(order.id, order.customer_id, 'COMPLETED').catch(() => null);

    return NextResponse.json({ status: 'COMPLETED', net_amount: order.net_amount });
  } catch (error) {
    return handleError(error);
  }
}
