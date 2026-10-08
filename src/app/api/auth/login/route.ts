export const dynamic = 'force-dynamic';

// POST /api/auth/login
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db';
import { setSessionCookie } from '@/lib/auth';
import { isEmailConfigured } from '@/lib/notify';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') return fail('Email and password are required');

    const user = await findUserByEmail(email.trim());
    const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !isMatch || user.role !== role) {
      return fail('Invalid email or password for this login type', 401);
    }
    const verifiedAt = (user as { email_verified_at?: string | null }).email_verified_at;
    if (!verifiedAt && user.role !== 'admin' && isEmailConfigured()) {
      return fail('Please confirm your email first. Check your inbox for the link, or request a new one on the "Confirm your email" page.', 403);
    }
    if (user.approval_status !== 'APPROVED') {
      return fail(`This account is ${user.approval_status.toLowerCase()}. An admin must approve it before login.`, 403);
    }
    if (user.account_status !== 'ACTIVE') {
      return fail(`This account is ${user.account_status.toLowerCase()}. Contact Zemba support.`, 403);
    }

    const res = NextResponse.json({
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      business_name: user.business_name,
    });
    setSessionCookie(res, user);
    return res;
  } catch (error) {
    return handleError(error, 'Could not log in. Please try again.');
  }
}
