export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute, query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get('product_id');
    if (!isUuid(productId)) return fail('product_id required');

    const reviews = await query(
      `SELECT r.*, u.full_name
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
    return NextResponse.json({ reviews, summary });
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

    await execute(
      `INSERT INTO product_reviews (product_id, seller_id, user_id, product_rating, seller_rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [product_id, product.seller_id, auth.user.id, product_rating, seller_rating, String(comment).trim().slice(0, 1000)]
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
