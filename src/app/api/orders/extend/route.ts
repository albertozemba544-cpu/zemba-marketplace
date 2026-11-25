export const dynamic = 'force-dynamic';

// The buyer asks for a few more days to check the item. The extra days are limited so the money is never
// held longer than the hold limit (14 days after payment). If something is wrong, the buyer opens a dispute instead.

import { NextRequest, NextResponse } from 'next/server';
import { execute, logEvent, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';
import { SITE } from '@/lib/site';
import { extendedRelease, formatWhen } from '@/lib/holding';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const { order_id } = await req.json();
    if (!isUuid(order_id)) return fail('order_id is required');

    const order = await queryOne<any>('SELECT * FROM orders WHERE id = $1 AND customer_id = $2', [order_id, auth.user.id]);
    if (!order) return fail('Order not found', 404);
    if (order.status !== 'DISPATCHED' || !order.auto_release_at) return fail('Only orders that are on their way can be extended', 409);

    const paidAt = new Date(order.paid_at || order.created_at);
    const next = extendedRelease(new Date(order.auto_release_at), paidAt);
    if (!next) {
      return fail(`The payment cannot be held longer than ${SITE.maxHoldDays} days after it was made. If something is wrong with the order, open a dispute.`, 409);
    }

    const changed = await execute(
      `UPDATE orders SET auto_release_at = $1, release_warnings_sent = 0, updated_at = now()
       WHERE id = $2 AND status = 'DISPATCHED'`,
      [next, order_id]
    );
    if (!changed) return fail('This order was just updated. Please try again.', 409);
    await logEvent(order_id, 'BUYER_EXTENDED_PROTECTION', { previous_release: order.auto_release_at, new_release: next.toISOString() });
    return NextResponse.json({ ok: true, auto_release_at: next.toISOString(), release_when: formatWhen(next) });
  } catch (error) {
    return handleError(error);
  }
}
