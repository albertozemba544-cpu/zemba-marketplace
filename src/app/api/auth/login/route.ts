export const dynamic = 'force-dynamic';

// POST /api/auth/login
// The session is intentionally simple for this local demo. Passwords are
// still verified with bcrypt so plaintext credentials never need to be stored.

import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = await req.json();
    const user = findUserByEmail(email);

    const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !isMatch || user.role !== role) {
      return NextResponse.json({ error: 'Invalid email or password for this login type' }, { status: 401 });
    }
    if (user.approval_status !== 'APPROVED') {
      return NextResponse.json({ error: `This account is ${user.approval_status.toLowerCase()}. An admin must approve it before login.` }, { status: 403 });
    }
    if (user.account_status !== 'ACTIVE') {
      return NextResponse.json({ error: `This account is ${user.account_status.toLowerCase()}. Contact Zemba support.` }, { status: 403 });
    }

    const res = NextResponse.json({ id: user.id, role: user.role, full_name: user.full_name });
    res.cookies.set('zemba_session', JSON.stringify({ id: user.id, role: user.role }), {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
