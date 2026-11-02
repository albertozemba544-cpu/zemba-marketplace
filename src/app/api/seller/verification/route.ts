export const dynamic = 'force-dynamic';

// The seller's own verification status. Verification is done by an admin on a short video call,
// so there is nothing to upload here and no ID photos are ever stored.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  try {
    const row = await queryOne<any>('SELECT verification_status, rejection_reason, verified_at FROM vendor_verification WHERE user_id = $1', [auth.user.id]);
    return NextResponse.json({
      status: row?.verification_status === 'VERIFIED' ? 'VERIFIED' : row?.verification_status === 'REJECTED' ? 'REJECTED' : 'NONE',
      reason: row?.rejection_reason || null,
      verified_at: row?.verified_at || null,
    });
  } catch (error) {
    return handleError(error);
  }
}
