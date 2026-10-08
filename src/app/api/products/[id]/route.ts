export const dynamic = 'force-dynamic';

// A seller's own listing: read it, edit it (including its photos), or remove it.
//
// Changing the price, stock or pausing a listing takes effect immediately.
// Changing the title, description, category or photos sends the listing back to the admin
// for a quick re-approval, so a listing cannot be swapped for something different after approval.

import { NextRequest, NextResponse } from 'next/server';
import { execute, query, queryOne, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { removeUploadedImage, saveUploadedImage } from '@/lib/storage';
import { fail, handleError, isUuid } from '@/lib/http';

const MAX_IMAGES = 5;

async function ensureImageRows(productId: string) {
  const sql = 'SELECT id, url, position FROM product_images WHERE product_id = $1 ORDER BY position, created_at';
  const rows = await query<{ id: string; url: string; position: number }>(sql, [productId]);
  if (rows.length) return rows;
  // older listings only have a single image_url: turn it into a photo row
  const legacy = await queryOne<{ image_url: string | null }>('SELECT image_url FROM products WHERE id = $1', [productId]);
  if (legacy?.image_url) {
    await execute('INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, 0)', [productId, legacy.image_url]);
    return query<{ id: string; url: string; position: number }>(sql, [productId]);
  }
  return [];
}

async function loadOwnProduct(id: string, userId: string, role: string) {
  if (!isUuid(id)) return null;
  const product = await queryOne<any>('SELECT * FROM products WHERE id = $1', [id]);
  if (!product || product.status === 'REMOVED') return null;
  if (role !== 'admin' && product.seller_id !== userId) return null;
  return product;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req, ['seller', 'admin']);
  if ('res' in auth) return auth.res;
  try {
    const product = await loadOwnProduct(params.id, auth.user.id, auth.user.role);
    if (!product) return fail('Listing not found', 404);
    const images = await ensureImageRows(product.id);
    return NextResponse.json({ product, images });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  try {
    const product = await loadOwnProduct(params.id, auth.user.id, 'seller');
    if (!product) return fail('Listing not found', 404);
    if (product.status === 'LINK_ONLY') return fail('Quick-link items cannot be edited here', 400);

    const form = await req.formData();
    const title = String(form.get('title') ?? product.title).trim();
    const description = String(form.get('description') ?? product.description ?? '').trim();
    const category = String(form.get('category') ?? product.category ?? '').trim() || 'General';
    const price = form.has('price') ? Number(form.get('price')) : Number(product.price);
    const stock = form.has('stock') ? Number(form.get('stock')) : Number(product.stock);
    const status = String(form.get('status') ?? product.status);
    const removeIds = String(form.get('remove_image_ids') || '').split(',').filter(isUuid);
    const newFiles = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);

    if (!title || title.length > 255) return fail('A title (up to 255 characters) is required');
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) return fail('Enter a valid price');
    if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) return fail('Enter a valid stock quantity');
    if (!['ACTIVE', 'PAUSED'].includes(status)) return fail('Status must be Active or Paused');

    const existing = await ensureImageRows(product.id);
    const toRemove = existing.filter((img) => removeIds.includes(img.id));
    if (existing.length - toRemove.length + newFiles.length > MAX_IMAGES) return fail(`A listing can have up to ${MAX_IMAGES} photos`);

    const uploaded: string[] = [];
    for (const file of newFiles) {
      try {
        uploaded.push(await saveUploadedImage(file, 'products'));
      } catch (error) {
        await Promise.all(uploaded.map((url) => removeUploadedImage(url)));
        return fail((error as Error).message, 400);
      }
    }

    const needsReview =
      title !== product.title ||
      description !== (product.description ?? '') ||
      category !== (product.category ?? 'General') ||
      toRemove.length > 0 ||
      uploaded.length > 0;

    await withTransaction(async (client) => {
      if (toRemove.length) {
        await client.query('DELETE FROM product_images WHERE id = ANY($1::uuid[]) AND product_id = $2', [toRemove.map((i) => i.id), product.id]);
      }
      const last = await client.query('SELECT COALESCE(MAX(position), -1) AS last FROM product_images WHERE product_id = $1', [product.id]);
      let position = Number(last.rows[0].last) + 1;
      for (const url of uploaded) {
        await client.query('INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, $3)', [product.id, url, position++]);
      }
      const first = await client.query('SELECT url FROM product_images WHERE product_id = $1 ORDER BY position, created_at LIMIT 1', [product.id]);
      await client.query(
        `UPDATE products
            SET title = $1, description = $2, category = $3, price = $4, stock = $5, status = $6,
                image_url = $7,
                approval_status = CASE WHEN $8::boolean THEN 'PENDING' ELSE approval_status END
          WHERE id = $9`,
        [title, description, category, Math.round(price * 100) / 100, stock, status, first.rows[0]?.url ?? null, needsReview, product.id]
      );
    });
    await Promise.all(toRemove.map((img) => removeUploadedImage(img.url)));

    return NextResponse.json({ ok: true, needs_review: needsReview });
  } catch (error) {
    return handleError(error, 'Could not save your changes');
  }
}

// "Remove" hides the listing for good but keeps it in the database, because past orders point to it.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  try {
    const product = await loadOwnProduct(params.id, auth.user.id, 'seller');
    if (!product) return fail('Listing not found', 404);
    await withTransaction(async (client) => {
      await client.query("UPDATE products SET status = 'REMOVED' WHERE id = $1", [product.id]);
      await client.query('DELETE FROM cart_items WHERE product_id = $1', [product.id]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
