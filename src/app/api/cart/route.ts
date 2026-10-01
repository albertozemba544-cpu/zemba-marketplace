export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute, query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const items = await query(
      `SELECT c.id AS cart_item_id, c.quantity, p.*
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.customer_id = $1
       ORDER BY c.created_at ASC`,
      [auth.user.id]
    );
    return NextResponse.json({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const { product_id, quantity } = await req.json();
    const qty = Number(quantity ?? 1);
    if (!isUuid(product_id) || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return fail('A valid product and quantity are required');
    }

    const product = await queryOne<{ stock: number }>(
      `SELECT stock FROM products
       WHERE id = $1 AND approval_status = 'APPROVED' AND status IN ('ACTIVE', 'LINK_ONLY')`,
      [product_id]
    );
    if (!product) return fail('This product is not available', 404);
    if (product.stock < 1) return fail('This product is sold out', 409);

    await execute(
      `INSERT INTO cart_items (customer_id, product_id, quantity)
       VALUES ($1, $2, LEAST($3::int, $4::int))
       ON CONFLICT (customer_id, product_id)
       DO UPDATE SET quantity = LEAST(cart_items.quantity + $3::int, $4::int)`,
      [auth.user.id, product_id, qty, product.stock]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const cartItemId = req.nextUrl.searchParams.get('cart_item_id');
    if (!isUuid(cartItemId)) return fail('cart_item_id required');
    await execute('DELETE FROM cart_items WHERE id = $1 AND customer_id = $2', [cartItemId, auth.user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
