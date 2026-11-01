export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
import { SITE, siteUrl } from '@/lib/site';
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

    const before = await queryOne<any>('SELECT email, phone_number, full_name, role, whatsapp_opt_in, account_status FROM users WHERE id = $1', [user_id]);
    const changed = await execute(
      "UPDATE users SET account_status = $1, user_category = $2, ban_reason = $3 WHERE id = $4 AND role <> 'admin'",
      [account_status, user_category, ban_reason || null, user_id]
    );
    if (!changed) return fail('User not found or admin accounts cannot be moderated', 404);
    if (before && before.account_status !== account_status) {
      const subject = account_status === 'ACTIVE' ? 'Your account is active again' : account_status === 'BANNED' ? 'Your account was closed' : 'Your account was suspended';
      const lines = account_status === 'ACTIVE'
        ? [`Your ${SITE.name} account is active again. You can log in as usual.`]
        : [account_status === 'BANNED' ? `Your ${SITE.name} account was closed.` : `Your ${SITE.name} account was suspended.`, `Reason: ${ban_reason || 'not given'}`, 'If you think this is a mistake, please contact us and we will look at it.'];
      await notifyUser(before, subject, { title: subject, lines, buttonText: 'Contact us', buttonUrl: `${siteUrl()}/contact` }, `Zemba: ${lines[0]}`.slice(0, 300), { event: 'ACCOUNT_NOTICE', link: `${siteUrl()}/contact` }).catch(() => null);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
