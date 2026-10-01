export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!isUuid(id)) return fail('Product not found', 404);
    const product = await queryOne(
      `SELECT p.*, COALESCE(u.business_name, u.full_name) AS seller_name
       FROM products p JOIN users u ON u.id = p.seller_id
       WHERE p.id = $1 AND p.approval_status = 'APPROVED' AND p.status IN ('ACTIVE', 'LINK_ONLY')`,
      [id]
    );
    return product ? NextResponse.json({ product }) : fail('Product not found', 404);
  } catch (error) {
    return handleError(error);
  }
}
