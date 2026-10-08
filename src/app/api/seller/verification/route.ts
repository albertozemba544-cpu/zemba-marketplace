export const dynamic = 'force-dynamic';

// Seller side of the ID check: see the status, and send an NRC photo + selfie.
// The photos go to a PRIVATE bucket and are deleted as soon as an admin decides.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { savePrivateImage, removePrivateImage } from '@/lib/storage';
import { alertAdmin } from '@/lib/alerts';
import { fail, handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  try {
    const row = await queryOne<any>(
      'SELECT verification_status, rejection_reason, submitted_at, verified_at FROM vendor_verification WHERE user_id = $1',
      [auth.user.id]
    );
    return NextResponse.json({
      status: row?.verification_status || 'NONE',
      reason: row?.rejection_reason || null,
      submitted_at: row?.submitted_at || null,
      verified_at: row?.verified_at || null,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  let nrcPath: string | null = null;
  let selfiePath: string | null = null;
  try {
    const current = await queryOne<{ verification_status: string }>('SELECT verification_status FROM vendor_verification WHERE user_id = $1', [auth.user.id]);
    const status = current?.verification_status || 'NONE';
    if (status === 'SUBMITTED') return fail('Your photos are already being checked', 409);
    if (status === 'VERIFIED') return fail('You are already verified', 409);

    const form = await req.formData();
    const nrc = form.get('nrc_photo');
    const selfie = form.get('selfie');
    if (!(nrc instanceof File) || nrc.size === 0 || !(selfie instanceof File) || selfie.size === 0) {
      return fail('Please add both a photo of your NRC and a selfie');
    }

    try {
      nrcPath = await savePrivateImage(nrc, 'nrc');
      selfiePath = await savePrivateImage(selfie, 'selfie');
    } catch (error) {
      await removePrivateImage(nrcPath);
      return fail((error as Error).message, 400);
    }

    await queryOne(
      `INSERT INTO vendor_verification (user_id, nrc_photo_path, selfie_path, verification_status, submitted_at)
       VALUES ($1, $2, $3, 'SUBMITTED', now())
       ON CONFLICT (user_id) DO UPDATE
         SET nrc_photo_path = EXCLUDED.nrc_photo_path, selfie_path = EXCLUDED.selfie_path,
             verification_status = 'SUBMITTED', submitted_at = now(), rejection_reason = NULL`,
      [auth.user.id, nrcPath, selfiePath]
    );
    await alertAdmin('A seller sent ID photos to check', `${auth.user.business_name || auth.user.full_name} is waiting for a Verified badge. Open Admin -> ID checks.`).catch(() => null);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    await removePrivateImage(nrcPath);
    await removePrivateImage(selfiePath);
    return handleError(error, 'Could not send your photos. Please try again.');
  }
}
