export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSellerTrust } from '@/lib/trust';
import { fail, handleError, isUuid } from '@/lib/http';

// Public shop page data: one seller, their trust numbers and their live products.
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!isUuid(id)) return fail('Shop not found', 404);
    const trust = await getSellerTrust(id);
    if (!trust) return fail('Shop not found', 404);

    const seller = await queryOne<{ name: string }>('SELECT COALESCE(business_name, full_name) AS name FROM users WHERE id = $1', [id]);
    const products = await query(
      "SELECT id, title, price, category, stock, image_url FROM products WHERE seller_id = $1 AND status = 'ACTIVE' AND approval_status = 'APPROVED' ORDER BY created_at DESC",
      [id]
    );
    const reviews = await queryOne<{ count: number; average: number }>(
      'SELECT COUNT(*) AS count, COALESCE(AVG(seller_rating), 0) AS average FROM product_reviews WHERE seller_id = $1',
      [id]
    );
    return NextResponse.json({ seller: { id, name: seller?.name || 'Seller', ...trust }, products, reviews });
  } catch (error) {
    return handleError(error);
  }
}
