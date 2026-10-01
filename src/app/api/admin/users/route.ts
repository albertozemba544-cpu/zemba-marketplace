export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';

const CATEGORIES = ['CUSTOMER', 'SELLER', 'PARTNER', 'VIP', 'WATCHLIST'];

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { user_id, account_status, user_category, ban_reason } = await req.json();
    if (!isUuid(user_id) || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(account_status) || !CATEGORIES.includes(user_category)) {
      return fail('Valid user status and category are required');
    }

    const changed = await execute(
      "UPDATE users SET account_status = $1, user_category = $2, ban_reason = $3 WHERE id = $4 AND role <> 'admin'",
      [account_status, user_category, ban_reason || null, user_id]
    );
    if (!changed) return fail('User not found or admin accounts cannot be moderated', 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
