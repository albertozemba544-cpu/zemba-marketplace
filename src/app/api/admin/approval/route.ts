import { NextRequest, NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { entity, id, decision } = await req.json();
  if (!['user', 'product'].includes(entity) || !['APPROVED', 'REJECTED'].includes(decision) || !id) {
    return NextResponse.json({ error: 'Invalid approval request' }, { status: 400 });
  }
  const table = entity === 'user' ? 'users' : 'products';
  const row = db.prepare(`SELECT id${entity === 'product' ? ', seller_id' : ''} FROM ${table} WHERE id = ?`).get(id) as any;
  if (!row) return NextResponse.json({ error: `${entity} not found` }, { status: 404 });
  db.prepare(`UPDATE ${table} SET approval_status = ? WHERE id = ?`).run(decision, id);
  if (entity === 'product' && row.seller_id) {
    db.prepare(`UPDATE products SET status = CASE WHEN ? = 'APPROVED' THEN 'ACTIVE' ELSE 'PAUSED' END WHERE id = ?`).run(decision, id);
    const eventOrder = db.prepare('SELECT id FROM orders WHERE product_id = ? ORDER BY created_at DESC LIMIT 1').get(id) as { id: string } | undefined;
    if (eventOrder) logEvent(eventOrder.id, 'PRODUCT_APPROVAL_UPDATED', { product_id: id, decision });
  }
  return NextResponse.json({ ok: true, entity, id, decision });
}