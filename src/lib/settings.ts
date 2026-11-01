// Small switches stored in the database so the admin can change them from the website (no redeploy needed).

import { execute, queryOne } from './db';

export async function getSetting(key: string, fallback = ''): Promise<string> {
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE key = $1', [key]);
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await execute(
    'INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
}

/** When true, no payment can be started and no money can be released. The admin sets this on the Controls page. */
export async function paymentsPaused(): Promise<boolean> {
  return (await getSetting('payments_paused', 'false')) === 'true';
}

/** A short message if money must not move on this order right now (paused, or the order is on hold), otherwise null. */
export async function moneyBlockReason(orderId?: string): Promise<string | null> {
  if (await paymentsPaused()) return 'Payments are paused for a short while. Please try again soon.';
  if (orderId) {
    const order = await queryOne<{ admin_hold: boolean }>('SELECT admin_hold FROM orders WHERE id = $1', [orderId]);
    if (order?.admin_hold) return 'This order is on hold while Zemba checks something. We will contact you.';
  }
  return null;
}
