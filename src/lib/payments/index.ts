// Chooses the payment provider from the settings in Vercel. Nothing is connected until PAYMENT_PROVIDER is set.
//
//   PAYMENT_PROVIDER   none (default) | demo | lipila | lenco
//   AUTO_PAYOUTS       true = the daily job sends due payouts and refunds by itself (default: false, you send them by hand)
//   PAYMENT_WEBHOOK_SECRET   the secret used to check the provider's webhook calls

import { DemoProvider } from './providers/demo';
import { LipilaProvider } from './providers/lipila';
import { LencoProvider } from './providers/lenco';
import type { PaymentProvider } from './types';

export * from './types';

export function paymentProviderName(): string {
  const name = (process.env.PAYMENT_PROVIDER || 'none').trim().toLowerCase();
  return ['demo', 'lipila', 'lenco'].includes(name) ? name : 'none';
}

export function getPaymentProvider(): PaymentProvider | null {
  switch (paymentProviderName()) {
    case 'demo': return new DemoProvider();
    case 'lipila': return new LipilaProvider();
    case 'lenco': return new LencoProvider();
    default: return null;
  }
}

/** True when automatic payouts and refunds are switched on. */
export function autoPayoutsEnabled(): boolean {
  return process.env.AUTO_PAYOUTS === 'true' && getPaymentProvider() !== null;
}

/** What is set up, without showing any secret (for the admin Controls page). */
export function paymentSetupStatus() {
  const name = paymentProviderName();
  const upper = name.toUpperCase();
  const has = (key: string) => Boolean(process.env[key]);
  return {
    provider: name,
    autoPayouts: autoPayoutsEnabled(),
    checks: name === 'none' || name === 'demo'
      ? []
      : [
          { name: `${upper}_API_KEY`, ok: has(`${upper}_API_KEY`) },
          { name: `${upper}_BASE_URL`, ok: has(`${upper}_BASE_URL`) },
          { name: 'PAYMENT_WEBHOOK_SECRET', ok: has('PAYMENT_WEBHOOK_SECRET') },
        ],
  };
}
