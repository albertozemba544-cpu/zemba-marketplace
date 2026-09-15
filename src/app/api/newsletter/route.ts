import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { email, user_id, subscribed } = await req.json();
  if (user_id) {
    db.prepare('UPDATE users SET newsletter_opt_in = ? WHERE id = ?').run(subscribed === false ? 0 : 1, user_id);
    return NextResponse.json({ ok: true });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'Create an account to receive Zemba updates' }, { status: 404 });
  db.prepare('UPDATE users SET newsletter_opt_in = 1 WHERE id = ?').run(user.id);
  return NextResponse.json({ ok: true });
}