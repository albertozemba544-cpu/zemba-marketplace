import { NextRequest, NextResponse } from 'next/server';

// Locks the whole admin area on the server. Only someone with a valid admin login can open any /admin page.
// Everyone else (visitors, buyers, sellers) is sent away before the page is even built.
// (The admin data itself is also protected: every /api/admin route checks for an admin login.)

export const config = { matcher: ['/admin/:path*'] };

const SESSION_COOKIE = 'zemba_session';

function secret(): string | null {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 16) return value;
  return process.env.NODE_ENV === 'production' ? null : 'dev-only-insecure-secret';
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  new Uint8Array(bytes).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

/** Reads the signed session cookie. Same signing as src/lib/auth.ts, using the Edge-safe Web Crypto API. */
async function sessionRole(token: string | undefined): Promise<string | null> {
  const key = secret();
  if (!token || !key) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  try {
    const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expected = toBase64Url(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(payload)));
    if (expected.length !== signature.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (diff !== 0) return null;
    const data = JSON.parse(fromBase64Url(payload));
    if (!data?.id || typeof data.exp !== 'number' || data.exp < Date.now() / 1000) return null;
    return String(data.role);
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // the admin sign-in form is the only admin page a signed-out person can open
  if (pathname === '/admin/login') return NextResponse.next();

  const role = await sessionRole(req.cookies.get(SESSION_COOKIE)?.value);
  if (role === 'admin') return NextResponse.next();

  const target = new URL(role ? '/' : '/admin/login', req.url); // buyers and sellers go home, signed-out people go to the sign-in form
  return NextResponse.redirect(target);
}
