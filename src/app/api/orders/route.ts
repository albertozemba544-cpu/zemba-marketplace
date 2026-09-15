// POST /api/orders — converts everything in a customer's cart into one
// escrow order per product (matching the orders table's one-product-per-row
// shape), clears the cart, and returns the new order references.

import { NextRequest, NextResponse } from 'next/server';
import { db, computeFees, logEvent } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { customer_id } = await req.json();
  if (!customer_id) return NextResponse.json({ error: 'customer_id required' }, { status: 400 });

  const items = db.prepare(`
    SELECT cart_items.quantity, products.*
    FROM cart_items JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.customer_id = ?
  `).all(customer_id) as any[];

  if (items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  const references: string[] = [];

  for (const item of items) {
    const lineTotal = item.price * item.quantity;
    const { platform_fee, net_amount } = computeFees(lineTotal);
    const id = randomUUID();
    const order_reference = id.slice(0, 8).toUpperCase();

    db.prepare(`
      INSERT INTO orders (id, order_reference, customer_id, seller_id, product_id, quantity, amount, platform_fee, net_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT')
    `).run(id, order_reference, customer_id, item.seller_id, item.id, item.quantity, lineTotal, platform_fee, net_amount);

    logEvent(id, 'ORDER_CREATED', { product: item.title, quantity: item.quantity });
    references.push(order_reference);
  }

  db.prepare('DELETE FROM cart_items WHERE customer_id = ?').run(customer_id);

  return NextResponse.json({ references });
}

export async function GET(req: NextRequest) {
  const sellerId = req.nextUrl.searchParams.get('seller_id');
  const rows = sellerId
    ? db.prepare('SELECT * FROM orders WHERE seller_id = ? ORDER BY created_at DESC').all(sellerId)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').all();
  return NextResponse.json({ orders: rows });
}
