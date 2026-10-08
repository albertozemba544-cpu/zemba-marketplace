export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute, query, queryOne } from '@/lib/db';
import { optionalUser, requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get('product_id');
    if (!isUuid(productId)) return fail('product_id required');

    const reviews = await query(
      `SELECT r.*, u.full_name, (r.order_id IS NOT NULL) AS verified_purchase
       FROM product_reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1 ORDER BY r.created_at DESC`,
      [productId]
    );
    const summary = await queryOne(
      `SELECT COUNT(*) AS count,
              COALESCE(AVG(product_rating), 0) AS product_rating,
              COALESCE(AVG(seller_rating), 0) AS seller_rating
       FROM product_reviews WHERE product_id = $1`,
      [productId]
    );
    // Can the person looking at this page write a review? Only buyers who received the item can.
    let eligibility: 'not_logged_in' | 'not_buyer' | 'already_reviewed' | 'no_completed_order' | 'ok' = 'not_logged_in';
    const user = await optionalUser(req);
    if (user) {
      if (user.role !== 'customer') eligibility = 'not_buyer';
      else if (await queryOne('SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2', [productId, user.id])) eligibility = 'already_reviewed';
      else if (await queryOne("SELECT id FROM orders WHERE product_id = $1 AND customer_id = $2 AND status = 'COMPLETED' LIMIT 1", [productId, user.id])) eligibility = 'ok';
      else eligibility = 'no_completed_order';
    }
    return NextResponse.json({ reviews, summary, eligibility });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const { product_id, product_rating, seller_rating, comment } = await req.json();
    if (!isUuid(product_id) || !product_rating || !seller_rating || !String(comment || '').trim()) {
      return fail('Product, ratings and comment are required');
    }
    if (![product_rating, seller_rating].every((r) => Number.isInteger(r) && r >= 1 && r <= 5)) {
      return fail('Ratings must be between 1 and 5');
    }

    const product = await queryOne<{ seller_id: string }>('SELECT seller_id FROM products WHERE id = $1', [product_id]);
    if (!product) return fail('Product not found', 404);

    const existing = await queryOne('SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2', [product_id, auth.user.id]);
    if (existing) return fail('You have already reviewed this product', 409);

    // The review is tied to a real order that was completed (delivery confirmed with the code).
    const order = await queryOne<{ id: string }>(
      `SELECT o.id FROM orders o
       WHERE o.product_id = $1 AND o.customer_id = $2 AND o.status = 'COMPLETED'
         AND NOT EXISTS (SELECT 1 FROM product_reviews r WHERE r.order_id = o.id)
       ORDER BY o.created_at DESC LIMIT 1`,
      [product_id, auth.user.id]
    );
    if (!order) return fail('Only buyers who have received this item can review it.', 403);

    await execute(
      `INSERT INTO product_reviews (product_id, seller_id, user_id, product_rating, seller_rating, comment, order_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [product_id, product.seller_id, auth.user.id, product_rating, seller_rating, String(comment).trim().slice(0, 1000), order.id]
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
