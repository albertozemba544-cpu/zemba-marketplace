import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { user_id, account_status, user_category, ban_reason } = await req.json();
  if (!user_id || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(account_status) || !user_category) {
    return NextResponse.json({ error: 'Valid user status and category are required' }, { status: 400 });
  }
  const result = db.prepare(`UPDATE users SET account_status = ?, user_category = ?, ban_reason = ? WHERE id = ? AND role != 'admin'`).run(account_status, user_category, ban_reason || null, user_id);
  if (!result.changes) return NextResponse.json({ error: 'User not found or admin accounts cannot be moderated' }, { status: 404 });
  return NextResponse.json({ ok: true });
}