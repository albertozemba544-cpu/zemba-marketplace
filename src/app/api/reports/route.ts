export const dynamic = 'force-dynamic';

// "Report this listing" / "Report this user". Three different people reporting the same thing hides a listing
// (or flags a seller) automatically until an admin has looked at it.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { alertAdmin } from '@/lib/alerts';
import { allow, TOO_MANY } from '@/lib/ratelimit';
import { fail, handleError, isUuid } from '@/lib/http';

const REASONS = ['SCAM', 'FAKE_ITEM', 'PROHIBITED', 'OFF_PLATFORM', 'OFFENSIVE', 'OTHER'];
const AUTO_FLAG_AT = 3;

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    if (!(await allow(`report-user:${auth.user.id}`, 10, 3600))) return fail(TOO_MANY, 429);
    const { target_type, target_id, reason, details } = await req.json();
    if (!['USER', 'PRODUCT'].includes(target_type) || !isUuid(target_id) || !REASONS.includes(reason)) return fail('Please choose what is wrong');
    if (target_type === 'USER' && target_id === auth.user.id) return fail('You cannot report yourself');

    if (target_type === 'PRODUCT') {
      const product = await queryOne<{ seller_id: string }>('SELECT seller_id FROM products WHERE id = $1', [target_id]);
      if (!product) return fail('Listing not found', 404);
      if (product.seller_id === auth.user.id) return fail('You cannot report your own listing');
    } else {
      const user = await queryOne('SELECT id FROM users WHERE id = $1 AND role <> \'admin\'', [target_id]);
      if (!user) return fail('User not found', 404);
    }

    const saved = await queryOne(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING RETURNING id`,
      [auth.user.id, target_type, target_id, reason, String(details || '').trim().slice(0, 1000) || null]
    );
    if (!saved) return fail('You have already reported this. Our team will look at it.', 409);

    const count = await queryOne<{ count: number }>(
      "SELECT COUNT(DISTINCT reporter_id) AS count FROM reports WHERE target_type = $1 AND target_id = $2 AND status = 'OPEN'",
      [target_type, target_id]
    );
    if ((count?.count ?? 0) >= AUTO_FLAG_AT) {
      if (target_type === 'PRODUCT') {
        await queryOne(
          "UPDATE products SET approval_status = 'FLAGGED', flag_reason = $2, flagged_at = now() WHERE id = $1 AND approval_status = 'APPROVED'",
          [target_id, `Reported by ${count?.count} people`]
        );
      } else {
        await queryOne('UPDATE users SET flag_reason = $2, flagged_at = COALESCE(flagged_at, now()) WHERE id = $1', [target_id, `Reported by ${count?.count} people`]);
      }
      await alertAdmin('Something was reported several times', 'Open Admin -> Flags & reports to review it.').catch(() => null);
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
