export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db';
import { isEmailConfigured, sendEmail } from '@/lib/notify';
import { createToken, recentTokenExists } from '@/lib/tokens';
import { siteUrl } from '@/lib/site';
import { fail, handleError } from '@/lib/http';

// POST /api/auth/forgot-password  { email }
// Always answers the same way, so nobody can use it to find out who has an account.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) return fail('Please enter a valid email address');
    if (!isEmailConfigured()) return fail('Password reset by email is not set up on this site yet. Please contact support.', 503);

    const user = await findUserByEmail(email.trim());
    if (user && user.account_status === 'ACTIVE' && !(await recentTokenExists(user.id, 'RESET_PASSWORD', 60))) {
      const token = await createToken(user.id, 'RESET_PASSWORD', 60);
      await sendEmail(user.email, 'Reset your password', {
        title: 'Reset your password',
        lines: [
          'We received a request to reset the password on your Zemba account. This link works for 1 hour.',
          'If you did not ask for this, you can ignore this email - your password will not change.',
        ],
        buttonText: 'Choose a new password',
        buttonUrl: `${siteUrl(req)}/reset-password?token=${token}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
