// Signed session cookies. The browser can no longer pretend to be someone else:
// the user id is read from a cookie that only this server can create.

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { findUserById, User } from './db';

export const SESSION_COOKIE = 'zemba_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is missing. Add a long random string in Vercel environment variables.');
    }
    return 'dev-only-insecure-secret';
  }
  return value;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(user: { id: string; role: string }): string {
  const payload = Buffer.from(
    JSON.stringify({ id: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string): { id: string; role: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.id || typeof data.exp !== 'number' || data.exp < Date.now() / 1000) return null;
    return { id: String(data.id), role: String(data.role) };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, user: { id: string; role: string }) {
  res.cookies.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

type Role = User['role'];

/** The logged-in user, or null. Never throws for a bad cookie. */
export async function optionalUser(req: NextRequest): Promise<User | null> {
  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await findUserById(session.id);
  if (!user || user.account_status !== 'ACTIVE' || user.approval_status !== 'APPROVED') return null;
  return user;
}

/**
 * Use at the top of a protected route:
 *   const auth = await requireUser(req, ['admin']);
 *   if ('res' in auth) return auth.res;
 *   const { user } = auth;
 */
export async function requireUser(
  req: NextRequest,
  roles?: Role[]
): Promise<{ user: User } | { res: NextResponse }> {
  const user = await optionalUser(req);
  if (!user) return { res: NextResponse.json({ error: 'Please log in to continue.' }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) {
    return { res: NextResponse.json({ error: 'You do not have access to this.' }, { status: 403 }) };
  }
  return { user };
}
