export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryOne, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';

// A quick link is a shareable page for one item. Each link gets its own hidden
// product (status LINK_ONLY) so it can go through the normal cart + escrow checkout
// without appearing in the public marketplace.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  try {
    const body = await req.json();
    const title = String(body.title || '').trim();
    const price = Math.round(Number(body.price) * 100) / 100;
    if (!title || title.length > 255 || !Number.isFinite(price) || price <= 0 || price > 10_000_000) {
      return fail('A title and a valid price are required');
    }

    const linkId = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    await withTransaction(async (client) => {
      let productId: string | null = null;
      let linkPrice = price;
      let linkTitle = title;

      if (body.product_id) {
        if (!isUuid(body.product_id)) throw Object.assign(new Error('bad product'), { userMessage: 'Product not found' });
        const existing = await client.query(
          "SELECT id, title, price FROM products WHERE id = $1 AND seller_id = $2 AND approval_status = 'APPROVED'",
          [body.product_id, auth.user.id]
        );
        if (!existing.rows[0]) throw Object.assign(new Error('bad product'), { userMessage: 'Product not found' });
        productId = existing.rows[0].id;
        linkPrice = Number(existing.rows[0].price); // the product price always wins
        linkTitle = existing.rows[0].title;
      } else {
        const created = await client.query(
          `INSERT INTO products (seller_id, title, description, price, category, stock, approval_status, status)
           VALUES ($1, $2, 'Quick link item', $3, 'Quick Link', 50, 'APPROVED', 'LINK_ONLY')
           RETURNING id`,
          [auth.user.id, title, price]
        );
        productId = created.rows[0].id;
      }

      await client.query(
        'INSERT INTO quick_links (id, seller_id, product_id, title, price) VALUES ($1, $2, $3, $4, $5)',
        [linkId, auth.user.id, productId, linkTitle, linkPrice]
      );
    });

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, '');
    return NextResponse.json({ link_id: linkId, share_url: `${baseUrl}/quick-pay/${linkId}`, qr_code: null }, { status: 201 });
  } catch (error) {
    const userMessage = (error as { userMessage?: string }).userMessage;
    if (userMessage) return fail(userMessage, 404);
    return handleError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const linkId = req.nextUrl.searchParams.get('link_id');
    if (!linkId || linkId.length > 20) return fail('link_id required');
    const link = await queryOne('SELECT id, product_id, seller_id, title, price, created_at FROM quick_links WHERE id = $1', [
      linkId.toUpperCase(),
    ]);
    return link ? NextResponse.json({ link }) : fail('Link not found', 404);
  } catch (error) {
    return handleError(error);
  }
}
