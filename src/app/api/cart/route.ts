import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id');
  if (!customerId) return NextResponse.json({ error: 'customer_id required' }, { status: 400 });

  const items = db.prepare(`
    SELECT cart_items.id as cart_item_id, cart_items.quantity, products.*
    FROM cart_items JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.customer_id = ?
  `).all(customerId) as any[];

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { customer_id, product_id, quantity } = await req.json();
  if (!customer_id || !product_id) {
    return NextResponse.json({ error: 'customer_id and product_id required' }, { status: 400 });
  }
  const existing = db.prepare('SELECT * FROM cart_items WHERE customer_id = ? AND product_id = ?').get(customer_id, product_id) as any;
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity ?? 1, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (id, customer_id, product_id, quantity) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), customer_id, product_id, quantity ?? 1);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const cartItemId = req.nextUrl.searchParams.get('cart_item_id');
  if (!cartItemId) return NextResponse.json({ error: 'cart_item_id required' }, { status: 400 });
  db.prepare('DELETE FROM cart_items WHERE id = ?').run(cartItemId);
  return NextResponse.json({ ok: true });
}
