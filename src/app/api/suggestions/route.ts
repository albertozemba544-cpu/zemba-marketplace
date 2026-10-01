export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { optionalUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest) {
  try {
    const { subject, message } = await req.json();
    if (!String(subject || '').trim() || !String(message || '').trim()) {
      return fail('Subject and suggestion are required');
    }
    const user = await optionalUser(req);
    await execute('INSERT INTO suggestions (user_id, subject, message) VALUES ($1, $2, $3)', [
      user?.id ?? null,
      String(subject).trim().slice(0, 120),
      String(message).trim().slice(0, 2000),
    ]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
