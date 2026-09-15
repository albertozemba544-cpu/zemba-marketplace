import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const product = db.prepare(`
    SELECT products.*, COALESCE(users.business_name, users.full_name) as seller_name
    FROM products JOIN users ON users.id = products.seller_id
    WHERE products.id = ?
  `).get(id);
  return product ? NextResponse.json({ product }) : NextResponse.json({ error: 'Product not found' }, { status: 404 });
}
