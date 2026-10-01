export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute, logEvent, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';

const MAX_PROTECTION_DAYS = 90;

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const { order_id } = await req.json();
    if (!isUuid(order_id)) return fail('order_id is required');

    const order = await queryOne<any>('SELECT * FROM orders WHERE id = $1 AND customer_id = $2', [order_id, auth.user.id]);
    if (!order) return fail('Order not found', 404);
    if (order.status !== 'DISPATCHED') return fail('Only dispatched orders can be extended', 409);
    if (order.timeout_days + 7 > MAX_PROTECTION_DAYS) return fail('This order cannot be extended any further', 409);

    await execute(
      'UPDATE orders SET timeout_days = timeout_days + 7, timeout_warning_sent_at = NULL, updated_at = now() WHERE id = $1',
      [order_id]
    );
    await logEvent(order_id, 'BUYER_EXTENDED_PROTECTION', { additional_days: 7 });
    return NextResponse.json({ ok: true, added_days: 7 });
  } catch (error) {
    return handleError(error);
  }
}
