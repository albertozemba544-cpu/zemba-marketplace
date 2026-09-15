import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });
  const reviews = db.prepare(`
    SELECT product_reviews.*, users.full_name
    FROM product_reviews JOIN users ON users.id = product_reviews.user_id
    WHERE product_reviews.product_id = ? ORDER BY product_reviews.created_at DESC
  `).all(productId);
  const summary = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(AVG(product_rating), 0) as product_rating,
    COALESCE(AVG(seller_rating), 0) as seller_rating
    FROM product_reviews WHERE product_id = ?
  `).get(productId);
  return NextResponse.json({ reviews, summary });
}

export async function POST(req: NextRequest) {
  const { product_id, user_id, product_rating, seller_rating, comment } = await req.json();
  const product = db.prepare('SELECT seller_id FROM products WHERE id = ?').get(product_id) as { seller_id: string } | undefined;
  if (!product_id || !user_id || !product_rating || !seller_rating || !comment?.trim()) {
    return NextResponse.json({ error: 'Product, ratings and comment are required' }, { status: 400 });
  }
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  if (![product_rating, seller_rating].every((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: 'Ratings must be between 1 and 5' }, { status: 400 });
  }
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'customer'").get(user_id);
  if (!user) return NextResponse.json({ error: 'Please sign in as a customer to review' }, { status: 403 });
  const existing = db.prepare('SELECT id FROM product_reviews WHERE product_id = ? AND user_id = ?').get(product_id, user_id);
  if (existing) return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 });
  db.prepare(`INSERT INTO product_reviews (id, product_id, seller_id, user_id, product_rating, seller_rating, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), product_id, product.seller_id, user_id, product_rating, seller_rating, comment.trim().slice(0, 1000));
  return NextResponse.json({ ok: true }, { status: 201 });
}
