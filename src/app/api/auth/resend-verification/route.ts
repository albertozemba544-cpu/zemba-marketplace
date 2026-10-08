export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db';
import { isEmailConfigured, sendEmail } from '@/lib/notify';
import { createToken, recentTokenExists } from '@/lib/tokens';
import { siteUrl } from '@/lib/site';
import { fail, handleError } from '@/lib/http';

// POST /api/auth/resend-verification  { email }
// Always answers the same way, so nobody can use it to find out who has an account.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) return fail('Please enter a valid email address');
    if (!isEmailConfigured()) return fail('Email is not set up on this site yet. Please contact support.', 503);

    const user = await findUserByEmail(email.trim());
    const verifiedAt = (user as { email_verified_at?: string | null } | undefined)?.email_verified_at;
    if (user && !verifiedAt && !(await recentTokenExists(user.id, 'VERIFY_EMAIL', 60))) {
      const token = await createToken(user.id, 'VERIFY_EMAIL', 60 * 24);
      await sendEmail(user.email, 'Confirm your email address', {
        title: 'Confirm your email address',
        lines: ['Click the button below to confirm your email address. This link works for 24 hours.'],
        buttonText: 'Confirm my email',
        buttonUrl: `${siteUrl(req)}/verify-email?token=${token}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
