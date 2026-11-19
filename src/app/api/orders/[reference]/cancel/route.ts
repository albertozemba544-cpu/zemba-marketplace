export const dynamic = 'force-dynamic';

// A buyer cancels a paid order before the seller has dispatched it.
// The buyer is refunded the item price less the cancellation fee. The buyer protection fee is not returned.
// The refund is added to the admin "Money to move" list.

import { NextRequest, NextResponse } from 'next/server';
import { getOrderByReference, logEvent, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createNotification } from '@/lib/orders';
import { moneyBlockReason } from '@/lib/settings';
import { buyerProtectionFee, cancellationFee, cancellationRefund } from '@/lib/fees';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest, { params }: { params: { reference: string } }) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const order = await getOrderByReference(params.reference);
    if (!order || order.customer_id !== auth.user.id) return fail('Order not found', 404);
    if (order.status !== 'FUNDS_SECURED') {
      return fail(
        order.status === 'DISPATCHED'
          ? 'The seller has already sent this order, so it can no longer be cancelled. If it does not arrive or is not as described, open a dispute.'
          : 'This order cannot be cancelled in its current state.',
        409
      );
    }
    const blocked = await moneyBlockReason(order.id);
    if (blocked) return fail(blocked, 503);

    const amount = Number(order.amount);
    const fee = cancellationFee(amount);
    const refund = cancellationRefund(amount);

    const cancelled = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE orders SET status = 'REFUNDED', refund_status = 'DUE', updated_at = now()
         WHERE id = $1 AND status = 'FUNDS_SECURED' RETURNING id`,
        [order.id]
      );
      if (updated.rowCount === 0) return false;
      // the item never left the seller, so it goes back on sale
      if (order.product_id) {
        await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [order.quantity, order.product_id]);
      }
      await logEvent(
        order.id,
        'BUYER_CANCELLED',
        { item_price: amount, cancellation_fee: fee, buyer_protection_fee: buyerProtectionFee(amount), refund_amount: refund },
        client
      );
      return true;
    });
    if (!cancelled) return fail('This order was already updated', 409);

    await createNotification(order.id, order.customer_id, 'REFUND_BUYER').catch(() => null);
    if (order.seller_id) await createNotification(order.id, order.seller_id, 'ORDER_CANCELLED').catch(() => null);

    return NextResponse.json({ status: 'REFUNDED', refund_amount: refund, cancellation_fee: fee });
  } catch (error) {
    return handleError(error);
  }
}
