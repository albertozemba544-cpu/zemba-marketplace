export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processEscrowTimeouts } from '@/workers/escrowTimeout';
import { execute } from '@/lib/db';
import { handleError } from '@/lib/http';

// Vercel Cron calls this daily and sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await processEscrowTimeouts();
    await execute("DELETE FROM rate_limits WHERE bucket < now() - interval '2 days'").catch(() => 0);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
