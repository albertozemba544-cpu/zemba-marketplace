export const dynamic = 'force-dynamic';

// POST /api/orders - turns the customer's cart into one escrow order per product.
// GET  /api/orders - sellers see their orders, customers see theirs, admins see all.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { computeFees, logEvent, query, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';

const ORDER_COLUMNS = `o.id, o.order_reference, o.customer_id, o.seller_id, o.product_id, o.quantity, o.amount,
  o.platform_fee, o.net_amount, o.status, o.waybill_image_url, o.timeout_days, o.created_at, o.updated_at, p.title`;

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const references = await withTransaction(async (client) => {
      const cart = await client.query(
        `SELECT c.id AS cart_item_id, c.quantity, p.id AS product_id, p.seller_id, p.title, p.price, p.stock
         FROM cart_items c JOIN products p ON p.id = c.product_id
         WHERE c.customer_id = $1
           AND p.approval_status = 'APPROVED' AND p.status IN ('ACTIVE', 'LINK_ONLY')`,
        [auth.user.id]
      );
      if (cart.rows.length === 0) throw Object.assign(new Error('Cart is empty'), { userMessage: 'Your cart is empty' });

      const refs: string[] = [];
      for (const item of cart.rows) {
        if (item.stock < item.quantity) {
          throw Object.assign(new Error('Not enough stock'), { userMessage: `Not enough stock for "${item.title}"` });
        }
        const lineTotal = Math.round(Number(item.price) * item.quantity * 100) / 100;
        const { platform_fee, net_amount } = computeFees(lineTotal);
        const id = randomUUID();
        const reference = id.replace(/-/g, '').slice(0, 10).toUpperCase();

        await client.query(
          `INSERT INTO orders (id, order_reference, customer_id, seller_id, product_id, quantity, amount, platform_fee, net_amount, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING_PAYMENT')`,
          [id, reference, auth.user.id, item.seller_id, item.product_id, item.quantity, lineTotal, platform_fee, net_amount]
        );
        await logEvent(id, 'ORDER_CREATED', { product: item.title, quantity: item.quantity }, client);
        refs.push(reference);
      }
      await client.query('DELETE FROM cart_items WHERE customer_id = $1', [auth.user.id]);
      return refs;
    });
    return NextResponse.json({ references });
  } catch (error) {
    const userMessage = (error as { userMessage?: string }).userMessage;
    if (userMessage) return fail(userMessage, 400);
    return handleError(error);
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    const { user } = auth;
    const base = `SELECT ${ORDER_COLUMNS} FROM orders o LEFT JOIN products p ON p.id = o.product_id`;
    const orders =
      user.role === 'seller'
        ? await query(`${base} WHERE o.seller_id = $1 ORDER BY o.created_at DESC`, [user.id])
        : user.role === 'customer'
          ? await query(`${base} WHERE o.customer_id = $1 ORDER BY o.created_at DESC`, [user.id])
          : await query(`${base} ORDER BY o.created_at DESC LIMIT 100`);
    return NextResponse.json({ orders });
  } catch (error) {
    return handleError(error);
  }
}
