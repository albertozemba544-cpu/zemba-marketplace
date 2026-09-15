import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { reference: string } }) {
  const { reference } = params;

  try {
    const order = db.prepare(`
      SELECT orders.*, products.title, users.business_name, users.full_name as seller_name
      FROM orders
      LEFT JOIN products ON products.id = orders.product_id
      LEFT JOIN users ON users.id = orders.seller_id
      WHERE orders.order_reference = ?
    `).get(reference);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Unable to fetch order' }, { status: 500 });
  }
}
