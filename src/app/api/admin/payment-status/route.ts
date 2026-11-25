export const dynamic = 'force-dynamic';

// What the payment setup looks like right now (which provider, which settings are in place). Never shows a secret.

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { handleError } from '@/lib/http';
import { paymentSetupStatus } from '@/lib/payments';
import { siteUrl } from '@/lib/site';
import { demoPaymentsEnabled } from '@/lib/flags';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    return NextResponse.json({ ...paymentSetupStatus(), demoPayments: demoPaymentsEnabled(), webhookUrl: `${siteUrl()}/api/payments/webhook`, paymentsLive: process.env.PAYMENTS_LIVE === 'true' });
  } catch (error) {
    return handleError(error);
  }
}
