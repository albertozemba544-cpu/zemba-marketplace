export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processEscrowTimeouts } from '@/workers/escrowTimeout';
import { handleError } from '@/lib/http';

// Vercel Cron calls this daily and sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await processEscrowTimeouts());
  } catch (error) {
    return handleError(error);
  }
}
