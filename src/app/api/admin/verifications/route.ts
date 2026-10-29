export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { removePrivateImage, signedPrivateUrl } from '@/lib/storage';
import { notifyUser } from '@/lib/notify';
import { SITE, siteUrl } from '@/lib/site';
import { fail, handleError, isUuid } from '@/lib/http';

// GET: sellers waiting for an ID check (photos are shown through 5-minute private links) + sellers already verified.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const waiting = await query<any>(
      `SELECT v.user_id, v.nrc_number, v.location, v.nrc_photo_path, v.selfie_path, v.submitted_at,
              u.full_name, u.business_name, u.phone_number, u.email
       FROM vendor_verification v JOIN users u ON u.id = v.user_id
       WHERE v.verification_status = 'SUBMITTED' ORDER BY v.submitted_at ASC`
    );
    const pending = [];
    for (const row of waiting) {
      pending.push({
        user_id: row.user_id,
        full_name: row.full_name,
        business_name: row.business_name,
        phone_number: row.phone_number,
        email: row.email,
        nrc_number: row.nrc_number,
        location: row.location,
        submitted_at: row.submitted_at,
        nrc_url: await signedPrivateUrl(row.nrc_photo_path),
        selfie_url: await signedPrivateUrl(row.selfie_path),
      });
    }
    const verified = await query(
      `SELECT v.user_id, v.verified_at, u.full_name, u.business_name, u.email
       FROM vendor_verification v JOIN users u ON u.id = v.user_id
       WHERE v.verification_status = 'VERIFIED' ORDER BY v.verified_at DESC`
    );
    const candidates = await query(
      `SELECT u.id AS user_id, u.full_name, u.business_name, u.email, u.phone_number, v.nrc_number, v.location
       FROM users u LEFT JOIN vendor_verification v ON v.user_id = u.id
       WHERE u.role = 'seller' AND u.approval_status = 'APPROVED' AND u.account_status = 'ACTIVE'
         AND COALESCE(v.verification_status, 'NONE') <> 'VERIFIED'
       ORDER BY u.created_at DESC`
    );
    return NextResponse.json({ pending, verified, candidates });
  } catch (error) {
    return handleError(error);
  }
}

// POST: approve, reject, or revoke. The ID photos are deleted as soon as a decision is made.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { user_id, action, reason } = await req.json();
    const note = String(reason || '').trim().slice(0, 300);
    if (!isUuid(user_id) || !['approve', 'reject', 'revoke', 'manual_verify'].includes(action)) return fail('Invalid request');
    if (action !== 'approve' && note.length < 3) return fail('Please give a short reason or note');

    if (action === 'manual_verify') {
      // Verified after checking the seller's ID and face on a live video call. No photos are stored.
      const seller = await queryOne<any>(
        `SELECT u.email, u.phone_number, u.full_name, u.role, u.whatsapp_opt_in, v.nrc_photo_path, v.selfie_path
         FROM users u LEFT JOIN vendor_verification v ON v.user_id = u.id
         WHERE u.id = $1 AND u.role = 'seller' AND u.approval_status = 'APPROVED'`,
        [user_id]
      );
      if (!seller) return fail('Seller not found', 404);
      await queryOne(
        `INSERT INTO vendor_verification (user_id, verification_status, verified_at, reviewed_by, verification_note)
         VALUES ($1, 'VERIFIED', now(), $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET verification_status = 'VERIFIED', verified_at = now(), reviewed_by = $2,
           verification_note = $3, rejection_reason = NULL, nrc_photo_path = NULL, selfie_path = NULL`,
        [user_id, auth.user.id, note]
      );
      await removePrivateImage(seller.nrc_photo_path);
      await removePrivateImage(seller.selfie_path);
      const subject = 'You are now a Verified seller';
      const lines = ['Good news: we checked your ID and your shop now shows the Verified seller badge. Buyers will see it on your listings.'];
      const link = `${siteUrl()}/seller/dashboard`;
      await notifyUser(seller, subject, { title: subject, lines, buttonText: 'Open on ' + SITE.name, buttonUrl: link }, `Zemba: ${lines[0]}`, { event: 'ID_APPROVE', link });
      return NextResponse.json({ ok: true });
    }

    const row = await queryOne<any>(
      `SELECT v.verification_status, v.nrc_photo_path, v.selfie_path, u.email, u.phone_number, u.full_name, u.role, u.whatsapp_opt_in
       FROM vendor_verification v JOIN users u ON u.id = v.user_id WHERE v.user_id = $1`,
      [user_id]
    );
    if (!row) return fail('Seller not found', 404);

    if (action === 'revoke') {
      if (row.verification_status !== 'VERIFIED') return fail('This seller is not verified', 409);
    } else if (row.verification_status !== 'SUBMITTED') {
      return fail('This seller is not waiting for a check', 409);
    }

    if (action === 'approve') {
      await queryOne(
        `UPDATE vendor_verification SET verification_status = 'VERIFIED', verified_at = now(), reviewed_by = $2,
                rejection_reason = NULL, nrc_photo_path = NULL, selfie_path = NULL WHERE user_id = $1`,
        [user_id, auth.user.id]
      );
    } else {
      const text = action === 'revoke' ? `Verified badge removed: ${note}` : note;
      await queryOne(
        `UPDATE vendor_verification SET verification_status = 'REJECTED', verified_at = NULL, reviewed_by = $2,
                rejection_reason = $3, nrc_photo_path = NULL, selfie_path = NULL WHERE user_id = $1`,
        [user_id, auth.user.id, text]
      );
    }
    await removePrivateImage(row.nrc_photo_path);
    await removePrivateImage(row.selfie_path);

    const link = `${siteUrl()}/seller/verify`;
    const lines =
      action === 'approve'
        ? ['Good news: we checked your ID and your shop now shows the Verified seller badge. Buyers will see it on your listings.']
        : action === 'reject'
          ? [`We could not verify your ID this time. Reason: ${note}`, 'You can send new photos from your seller dashboard. Your earlier photos have been deleted.']
          : [`Your Verified badge was removed. Reason: ${note}`, 'Contact us if you think this is a mistake.'];
    const subject = action === 'approve' ? 'You are now a Verified seller' : action === 'reject' ? 'Your ID check needs another try' : 'Your Verified badge was removed';
    await notifyUser(row, subject, { title: subject, lines, buttonText: 'Open on ' + SITE.name, buttonUrl: link }, `Zemba: ${lines[0]}`, { event: `ID_${action.toUpperCase()}`, link });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
