import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { dispute_id, sender_id, message } = await req.json();

  if (!dispute_id || !sender_id || !message) {
    return NextResponse.json({ error: 'dispute_id, sender_id, and message are required' }, { status: 400 });
  }

  try {
    const msg_id = randomUUID();
    db.prepare(`
      INSERT INTO dispute_messages (id, dispute_id, sender_id, message, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(msg_id, dispute_id, sender_id, message);

    return NextResponse.json({ msg_id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to post message' }, { status: 500 });
  }
}
