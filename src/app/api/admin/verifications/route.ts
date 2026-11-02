export const dynamic = 'force-dynamic';

// Sellers are verified by an admin on a short video call. Nothing is uploaded or stored except a short note.

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
    const candidates = await query(
      `SELECT u.id AS user_id, u.full_name, u.business_name, u.email, u.phone_number, v.nrc_number, v.location
       FROM users u LEFT JOIN vendor_verification v ON v.user_id = u.id
       WHERE u.role = 'seller' AND u.approval_status = 'APPROVED' AND u.account_status = 'ACTIVE'
         AND COALESCE(v.verification_status, 'NONE') <> 'VERIFIED'
       ORDER BY u.created_at DESC`
    );
    const verified = await query(
      `SELECT v.user_id, v.verified_at, v.verification_note, u.full_name, u.business_name, u.email
       FROM vendor_verification v JOIN users u ON u.id = v.user_id
       WHERE v.verification_status = 'VERIFIED' ORDER BY v.verified_at DESC`
    );
    return NextResponse.json({ candidates, verified });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { user_id, action, reason } = await req.json();
    const note = String(reason || '').trim().slice(0, 300);
    if (!isUuid(user_id) || !['verify', 'revoke'].includes(action)) return fail('Invalid request');
    if (note.length < 3) return fail('Please write a short note (for example: "ID checked on video call, 12 Nov")');

    const seller = await queryOne<any>(
      `SELECT u.email, u.phone_number, u.full_name, u.role, u.whatsapp_opt_in, v.verification_status
       FROM users u LEFT JOIN vendor_verification v ON v.user_id = u.id WHERE u.id = $1 AND u.role = 'seller'`,
      [user_id]
    );
    if (!seller) return fail('Seller not found', 404);

    let subject: string;
    let lines: string[];
    if (action === 'verify') {
      await queryOne(
        `INSERT INTO vendor_verification (user_id, verification_status, verified_at, reviewed_by, verification_note)
         VALUES ($1, 'VERIFIED', now(), $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET verification_status = 'VERIFIED', verified_at = now(), reviewed_by = $2,
           verification_note = $3, rejection_reason = NULL`,
        [user_id, auth.user.id, note]
      );
      subject = 'You are now a Verified seller';
      lines = ['Good news: we checked your ID and your shop now shows the Verified seller badge. Buyers will see it on your listings.'];
    } else {
      if (seller.verification_status !== 'VERIFIED') return fail('This seller is not verified', 409);
      await queryOne(
        `UPDATE vendor_verification SET verification_status = 'REJECTED', verified_at = NULL, reviewed_by = $2, rejection_reason = $3 WHERE user_id = $1`,
        [user_id, auth.user.id, `Verified badge removed: ${note}`]
      );
      subject = 'Your Verified badge was removed';
      lines = [`Your Verified badge was removed. Reason: ${note}`, 'Contact us if you think this is a mistake.'];
    }
    const link = `${siteUrl()}/seller/dashboard`;
    await notifyUser(seller, subject, { title: subject, lines, buttonText: 'Open on ' + SITE.name, buttonUrl: link }, `Zemba: ${lines[0]}`.slice(0, 300), { event: `ID_${action.toUpperCase()}`, link });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
