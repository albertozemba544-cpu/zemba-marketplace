export const dynamic = 'force-dynamic';

// Everything that needs an admin's eyes: flagged listings, reported listings and users, flagged users.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';
import { SITE, siteUrl } from '@/lib/site';
import { fail, handleError, isUuid } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const flaggedProducts = await query(
      `SELECT p.id, p.title, p.price, p.image_url, p.flag_reason, p.flagged_at, p.seller_id, COALESCE(u.business_name, u.full_name) AS seller_name
       FROM products p JOIN users u ON u.id = p.seller_id
       WHERE p.approval_status = 'FLAGGED' ORDER BY p.flagged_at DESC NULLS LAST`
    );
    const groups = await query<any>(
      `SELECT target_type, target_id, COUNT(*) AS count, array_agg(DISTINCT reason) AS reasons, MIN(created_at) AS first_at
       FROM reports WHERE status = 'OPEN' GROUP BY target_type, target_id ORDER BY COUNT(*) DESC, MIN(created_at) ASC LIMIT 100`
    );
    const reports = [];
    for (const g of groups) {
      const details = await query<{ details: string }>(
        "SELECT details FROM reports WHERE target_type = $1 AND target_id = $2 AND status = 'OPEN' AND details IS NOT NULL AND details <> '' ORDER BY created_at DESC LIMIT 3",
        [g.target_type, g.target_id]
      );
      let name = '';
      let extra = '';
      if (g.target_type === 'PRODUCT') {
        const p = await queryOne<any>("SELECT p.title, p.approval_status, COALESCE(u.business_name, u.full_name) AS seller FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = $1", [g.target_id]);
        name = p?.title || '(deleted listing)';
        extra = p ? `Seller: ${p.seller} · ${p.approval_status}` : '';
      } else {
        const u = await queryOne<any>('SELECT COALESCE(business_name, full_name) AS name, email, role, account_status FROM users WHERE id = $1', [g.target_id]);
        name = u?.name || '(deleted user)';
        extra = u ? `${u.role} · ${u.email} · ${u.account_status}` : '';
      }
      reports.push({ target_type: g.target_type, target_id: g.target_id, count: g.count, reasons: g.reasons, first_at: g.first_at, name, extra, details: details.map((d) => d.details) });
    }
    const flaggedUsers = await query(
      `SELECT id, full_name, business_name, email, role, account_status, flag_reason, flagged_at FROM users
       WHERE flagged_at IS NOT NULL AND role <> 'admin' ORDER BY flagged_at DESC`
    );
    return NextResponse.json({ flaggedProducts, reports, flaggedUsers });
  } catch (error) {
    return handleError(error);
  }
}

async function tellUser(userId: string, subject: string, lines: string[]) {
  const user = await queryOne<any>('SELECT email, phone_number, full_name, role, whatsapp_opt_in FROM users WHERE id = $1', [userId]);
  if (!user) return;
  await notifyUser(user, subject, { title: subject, lines, buttonText: 'Contact us', buttonUrl: `${siteUrl()}/contact` }, `Zemba: ${lines[0]}`.slice(0, 300), { event: 'ACCOUNT_NOTICE', link: `${siteUrl()}/contact` });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { action, target_id, reason } = await req.json();
    const note = String(reason || '').trim().slice(0, 300);
    const actions = ['restore_product', 'remove_product', 'dismiss_product', 'dismiss_user', 'suspend_user', 'ban_user'];
    if (!actions.includes(action) || !isUuid(target_id)) return fail('Invalid request');
    if (['remove_product', 'suspend_user', 'ban_user'].includes(action) && note.length < 3) return fail('Please give a short reason. It is sent to the person.');

    if (action === 'restore_product' || action === 'dismiss_product') {
      await queryOne("UPDATE products SET approval_status = 'APPROVED', flag_reason = NULL, flagged_at = NULL WHERE id = $1 AND approval_status = 'FLAGGED'", [target_id]);
      await queryOne("UPDATE reports SET status = 'DISMISSED', handled_by = $2, handled_at = now() WHERE target_type = 'PRODUCT' AND target_id = $1 AND status = 'OPEN'", [target_id, auth.user.id]);
    } else if (action === 'remove_product') {
      const p = await queryOne<{ seller_id: string; title: string }>("UPDATE products SET approval_status = 'REJECTED', status = 'REMOVED', flag_reason = $2 WHERE id = $1 RETURNING seller_id, title", [target_id, note]);
      await queryOne("UPDATE reports SET status = 'ACTIONED', handled_by = $2, handled_at = now() WHERE target_type = 'PRODUCT' AND target_id = $1 AND status = 'OPEN'", [target_id, auth.user.id]);
      if (p) await tellUser(p.seller_id, 'A listing was removed', [`Your listing "${p.title}" was removed from ${SITE.name}.`, `Reason: ${note}`, 'If you think this is a mistake, please contact us.']);
    } else if (action === 'dismiss_user') {
      await queryOne('UPDATE users SET flagged_at = NULL, flag_reason = NULL WHERE id = $1', [target_id]);
      await queryOne("UPDATE reports SET status = 'DISMISSED', handled_by = $2, handled_at = now() WHERE target_type = 'USER' AND target_id = $1 AND status = 'OPEN'", [target_id, auth.user.id]);
    } else {
      const status = action === 'ban_user' ? 'BANNED' : 'SUSPENDED';
      const changed = await queryOne("UPDATE users SET account_status = $2, ban_reason = $3, flagged_at = NULL, flag_reason = NULL WHERE id = $1 AND role <> 'admin' RETURNING id", [target_id, status, note]);
      if (!changed) return fail('User not found', 404);
      await queryOne("UPDATE reports SET status = 'ACTIONED', handled_by = $2, handled_at = now() WHERE target_type = 'USER' AND target_id = $1 AND status = 'OPEN'", [target_id, auth.user.id]);
      await tellUser(target_id, status === 'BANNED' ? 'Your account was closed' : 'Your account was suspended', [
        status === 'BANNED' ? `Your ${SITE.name} account was closed.` : `Your ${SITE.name} account was suspended.`,
        `Reason: ${note}`,
        'If you think this is a mistake, please contact us and we will look at it.',
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
