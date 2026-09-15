import { NextRequest, NextResponse } from 'next/server';
import { db, getOrderByReference, logEvent } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: { reference: string } }) {
  const order = getOrderByReference(params.reference);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'PENDING_PAYMENT') return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 400 });
  const deliveryCode = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare(`UPDATE orders SET status = 'FUNDS_SECURED', gateway_transaction_id = ?, delivery_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(`DEMO-MOMO-${Date.now()}`, deliveryCode, order.id);
  logEvent(order.id, 'PAYMENT_SECURED', { provider: 'DEMO_MOBILE_MONEY' });
  
  // Send notifications
  if (order.seller_id) {
    fetch(new URL('/api/notifications', _req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        recipient_id: order.seller_id,
        notification_type: 'FUNDS_SECURED',
      }),
    }).catch(() => {});
  }
  
  if (!(_req.headers.get('content-type') || '').includes('application/json')) {
    return NextResponse.redirect(new URL(`/checkout/${order.order_reference}`, _req.url));
  }
  return NextResponse.json({ status: 'FUNDS_SECURED', delivery_code: deliveryCode });
}
