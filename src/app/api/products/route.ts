export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, withTransaction } from '@/lib/db';
import { optionalUser, requireUser } from '@/lib/auth';
import { saveUploadedImage } from '@/lib/storage';
import { fail, handleError, isUuid } from '@/lib/http';

const MAX_IMAGES = 5;

// GET /api/products                -> public marketplace listing
// GET /api/products?seller_id=...  -> that seller's own listings (seller or admin only)
export async function GET(req: NextRequest) {
  try {
    const sellerId = req.nextUrl.searchParams.get('seller_id');
    if (sellerId) {
      const user = await optionalUser(req);
      if (!user || !isUuid(sellerId) || (user.role !== 'admin' && user.id !== sellerId)) {
        return fail('Not allowed', 403);
      }
      const rows = await query(
        "SELECT * FROM products WHERE seller_id = $1 AND status NOT IN ('LINK_ONLY', 'REMOVED') ORDER BY created_at DESC",
        [sellerId]
      );
      return NextResponse.json({ products: rows });
    }
    const rows = await query(
      `SELECT p.*, COALESCE(v.verification_status = 'VERIFIED', false) AS seller_verified,
              (SELECT COUNT(*) FROM product_reviews r WHERE r.product_id = p.id) AS review_count,
              (SELECT AVG(r.product_rating) FROM product_reviews r WHERE r.product_id = p.id) AS avg_rating
       FROM products p LEFT JOIN vendor_verification v ON v.user_id = p.seller_id
       WHERE p.status = 'ACTIVE' AND p.approval_status = 'APPROVED' ORDER BY p.created_at DESC`
    );
    return NextResponse.json({ products: rows });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  try {
    const contentType = req.headers.get('content-type') || '';
    let title = '';
    let description = '';
    let price = NaN;
    let category = '';
    let stock = 1;
    let imageFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      title = String(form.get('title') || '').trim();
      description = String(form.get('description') || '').trim();
      price = Number(form.get('price'));
      category = String(form.get('category') || '').trim();
      stock = Number(form.get('stock') || 1);
      imageFiles = [...form.getAll('images'), form.get('image')].filter((f): f is File => f instanceof File && f.size > 0);
    } else {
      const body = await req.json();
      title = String(body.title || '').trim();
      description = String(body.description || '').trim();
      price = Number(body.price);
      category = String(body.category || '').trim();
      stock = Number(body.stock ?? 1);
    }

    if (!title || title.length > 255) return fail('A title (up to 255 characters) is required');
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) return fail('Enter a valid price');
    if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) return fail('Enter a valid stock quantity');
    if (imageFiles.length > MAX_IMAGES) return fail(`You can add up to ${MAX_IMAGES} photos`);

    const urls: string[] = [];
    for (const file of imageFiles) {
      try {
        urls.push(await saveUploadedImage(file, 'products'));
      } catch (error) {
        return fail((error as Error).message, 400);
      }
    }

    const id = await withTransaction(async (client) => {
      const created = await client.query(
        `INSERT INTO products (seller_id, title, description, price, category, stock, image_url, approval_status, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 'ACTIVE')
         RETURNING id`,
        [auth.user.id, title, description, Math.round(price * 100) / 100, category || 'General', stock, urls[0] ?? null]
      );
      const productId = created.rows[0].id as string;
      for (let i = 0; i < urls.length; i++) {
        await client.query('INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, $3)', [productId, urls[i], i]);
      }
      return productId;
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Could not publish listing');
  }
}
