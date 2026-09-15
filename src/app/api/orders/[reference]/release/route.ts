import { NextRequest, NextResponse } from 'next/server';
import { db, getOrderByReference, logEvent } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { reference: string } }) {
  const contentType = req.headers.get('content-type') || '';
  const { code } = contentType.includes('application/json') ? await req.json() : Object.fromEntries((await req.formData()).entries());
  const order = getOrderByReference(params.reference);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (order.status !== 'FUNDS_SECURED' && order.status !== 'DISPATCHED') {
    return NextResponse.json({ error: `Cannot release from status ${order.status}` }, { status: 400 });
  }
  if (order.delivery_code && code !== order.delivery_code) {
    return NextResponse.json({ error: 'Incorrect delivery code' }, { status: 400 });
  }

  db.prepare(`UPDATE orders SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(order.id);
  logEvent(order.id, 'COMPLETED', { released_by: 'buyer_confirmation' });
  
  // Send notifications
  if (order.seller_id) {
    fetch(new URL('/api/notifications', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        recipient_id: order.seller_id,
        notification_type: 'DELIVERY_CONFIRMED',
      }),
    }).catch(() => {});
  }
  
  if (order.customer_id) {
    fetch(new URL('/api/notifications', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        recipient_id: order.customer_id,
        notification_type: 'COMPLETED',
      }),
    }).catch(() => {});
  }
  
  // TODO: call the gateway's payout API to send order.net_amount to the seller's momo_number.

  if (!contentType.includes('application/json')) {
    return NextResponse.redirect(new URL(`/checkout/${order.order_reference}`, req.url));
  }
  return NextResponse.json({ status: 'COMPLETED', net_amount: order.net_amount });
}
