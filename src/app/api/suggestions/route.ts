import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { user_id, subject, message } = await req.json();
  if (!subject?.trim() || !message?.trim()) return NextResponse.json({ error: 'Subject and suggestion are required' }, { status: 400 });
  const user = user_id ? db.prepare('SELECT id FROM users WHERE id = ?').get(user_id) : null;
  db.prepare('INSERT INTO suggestions (id, user_id, subject, message) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), user ? user_id : null, subject.trim().slice(0, 120), message.trim().slice(0, 2000));
  return NextResponse.json({ ok: true }, { status: 201 });
}
