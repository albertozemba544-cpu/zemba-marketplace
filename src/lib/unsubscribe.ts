// "Unsubscribe" links for news emails. The link carries a signed code, so nobody can unsubscribe someone else.

import crypto from 'crypto';
import { siteUrl } from './site';

function secret(): string {
  return process.env.SESSION_SECRET || 'dev-only-insecure-secret';
}

function sign(value: string): string {
  return crypto.createHmac('sha256', secret()).update(`unsubscribe:${value}`).digest('base64url').slice(0, 32);
}

export function unsubscribeUrl(userId: string): string {
  return `${siteUrl()}/unsubscribe?token=${Buffer.from(userId).toString('base64url')}.${sign(userId)}`;
}

export function readUnsubscribeToken(token: string): string | null {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) return null;
  const userId = Buffer.from(encoded, 'base64url').toString('utf8');
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return userId;
}
