import { NextRequest, NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { order_id, customer_id } = await req.json();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?').get(order_id, customer_id) as any;
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'DISPATCHED') return NextResponse.json({ error: 'Only dispatched orders can be extended' }, { status: 409 });
  db.prepare(`UPDATE orders SET timeout_days = timeout_days + 7, timeout_warning_sent_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(order_id);
  logEvent(order_id, 'BUYER_EXTENDED_PROTECTION', { additional_days: 7 });
  return NextResponse.json({ ok: true, added_days: 7 });
}