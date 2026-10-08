export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSellerTrust } from '@/lib/trust';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!isUuid(id)) return fail('Product not found', 404);
    const product = await queryOne<any>(
      `SELECT p.*, COALESCE(u.business_name, u.full_name) AS seller_name
       FROM products p JOIN users u ON u.id = p.seller_id
       WHERE p.id = $1 AND p.approval_status = 'APPROVED' AND p.status IN ('ACTIVE', 'LINK_ONLY')`,
      [id]
    );
    if (!product) return fail('Product not found', 404);

    let images = await query<{ id: string; url: string }>('SELECT id, url FROM product_images WHERE product_id = $1 ORDER BY position, created_at', [id]);
    if (images.length === 0 && product.image_url) images = [{ id: 'main', url: product.image_url }];
    const seller_trust = await getSellerTrust(product.seller_id).catch(() => null);
    return NextResponse.json({ product: { ...product, images, seller_trust } });
  } catch (error) {
    return handleError(error);
  }
}
