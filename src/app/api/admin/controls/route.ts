export const dynamic = 'force-dynamic';

// The admin's brakes: pause all money movement, or put a single order on hold.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, logEvent } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notifyParty } from '@/lib/disputes';
import { paymentsPaused, setSetting } from '@/lib/settings';
import { fail, handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const held = await query(
      `SELECT o.order_reference, o.amount, o.status, o.hold_reason, o.updated_at, p.title
       FROM orders o LEFT JOIN products p ON p.id = o.product_id WHERE o.admin_hold = true ORDER BY o.updated_at DESC`
    );
    return NextResponse.json({ payments_paused: await paymentsPaused(), held });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { action, reference, reason } = await req.json();
    if (action === 'pause' || action === 'resume') {
      await setSetting('payments_paused', action === 'pause' ? 'true' : 'false');
      return NextResponse.json({ ok: true, payments_paused: action === 'pause' });
    }
    if (action === 'hold' || action === 'unhold') {
      const ref = String(reference || '').trim();
      const note = String(reason || '').trim().slice(0, 300);
      if (!ref) return fail('Enter the order number');
      if (action === 'hold' && note.length < 3) return fail('Please give a short reason. The buyer and seller are told.');
      const order = await queryOne<any>(
        'UPDATE orders SET admin_hold = $2, hold_reason = $3, updated_at = now() WHERE upper(order_reference) = upper($1) RETURNING id, customer_id, seller_id, order_reference',
        [ref, action === 'hold', action === 'hold' ? note : null]
      );
      if (!order) return fail('Order not found', 404);
      await logEvent(order.id, action === 'hold' ? 'ADMIN_HOLD' : 'ADMIN_HOLD_RELEASED', { reason: note, by: auth.user.id });
      const text = action === 'hold'
        ? `Order #${order.order_reference} is on hold while the Zemba team checks something. No money moves until it is cleared. Reason: ${note}`
        : `The hold on order #${order.order_reference} was removed. It continues as normal.`;
      await notifyParty(order.id, order.customer_id, action === 'hold' ? 'Your order is on hold' : 'Your order hold was removed', text);
      await notifyParty(order.id, order.seller_id, action === 'hold' ? 'An order is on hold' : 'An order hold was removed', text);
      return NextResponse.json({ ok: true });
    }
    return fail('Invalid request');
  } catch (error) {
    return handleError(error);
  }
}
