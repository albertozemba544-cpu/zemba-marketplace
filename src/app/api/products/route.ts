export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { optionalUser, requireUser } from '@/lib/auth';
import { saveUploadedImage } from '@/lib/storage';
import { fail, handleError, isUuid } from '@/lib/http';

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
        "SELECT * FROM products WHERE seller_id = $1 AND status <> 'LINK_ONLY' ORDER BY created_at DESC",
        [sellerId]
      );
      return NextResponse.json({ products: rows });
    }
    const rows = await query(
      "SELECT * FROM products WHERE status = 'ACTIVE' AND approval_status = 'APPROVED' ORDER BY created_at DESC"
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
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      title = String(form.get('title') || '').trim();
      description = String(form.get('description') || '').trim();
      price = Number(form.get('price'));
      category = String(form.get('category') || '').trim();
      stock = Number(form.get('stock') || 1);
      const image = form.get('image');
      if (image instanceof File && image.size > 0) imageFile = image;
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

    let imageUrl: string | null = null;
    if (imageFile) {
      try {
        imageUrl = await saveUploadedImage(imageFile, 'products');
      } catch (error) {
        return fail((error as Error).message, 400);
      }
    }

    const created = await queryOne<{ id: string }>(
      `INSERT INTO products (seller_id, title, description, price, category, stock, image_url, approval_status, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 'ACTIVE')
       RETURNING id`,
      [auth.user.id, title, description, Math.round(price * 100) / 100, category || 'General', stock, imageUrl]
    );
    return NextResponse.json({ id: created?.id }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Could not publish listing');
  }
}
