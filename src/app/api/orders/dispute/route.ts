import { NextRequest, NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { order_id, customer_id, reason } = await req.json();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?').get(order_id, customer_id) as any;
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (!reason) return NextResponse.json({ error: 'A dispute reason is required' }, { status: 400 });
  const disputeId = randomUUID();
  db.prepare(`INSERT INTO disputes (id, order_id, raised_by, reason) VALUES (?, ?, ?, ?)`).run(disputeId, order_id, customer_id, reason);
  db.prepare(`UPDATE orders SET status = 'DISPUTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(order_id);
  logEvent(order_id, 'BUYER_DISPUTE_OPENED', { dispute_id: disputeId, reason });
  return NextResponse.json({ ok: true, dispute_id: disputeId }, { status: 201 });
}