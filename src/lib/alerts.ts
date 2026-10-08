// Emails the site owner when the website itself breaks (a 500 error).
// Set ADMIN_ALERT_EMAIL to turn this on. At most one alert every 10 minutes per server.

import { isEmailConfigured, sendEmail } from './notify';

let lastAlertAt = 0;

export async function alertAdmin(subject: string, details: string): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to || !isEmailConfigured()) return;
  const now = Date.now();
  if (now - lastAlertAt < 10 * 60 * 1000) return;
  lastAlertAt = now;
  await sendEmail(to, `[Zemba alert] ${subject}`, {
    title: subject,
    lines: [details.slice(0, 1500), 'Open Vercel -> your project -> Logs for the full details.'],
  }).catch(() => false);
}
