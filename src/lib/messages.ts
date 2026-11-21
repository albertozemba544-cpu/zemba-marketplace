// Messages between buyers and sellers. Zemba is the go-between: people write on the website, and the other
// person is told by email (and by WhatsApp if they opted in) that "Zemba Marketplace" has a message for them.
// Phone numbers, email addresses and links are hidden so that deals stay protected by escrow.

import { queryOne } from './db';
import { notifyUser } from './notify';
import { SITE, siteUrl } from './site';

export const MAX_MESSAGE_LENGTH = 1000;
const NOTIFY_EVERY_MINUTES = 10; // a busy chat sends one alert at most this often

const PHONE = /(?:\+?260|\b0)[\s.-]?\(?[79][5-7]\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const LONG_NUMBER = /\b\d[\d\s.-]{8,}\d\b/g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINK = /(?:https?:\/\/|www\.|wa\.me\/|t\.me\/|\b[a-z0-9-]+\.(?:com|net|org|co\.zm|zm|me|xyz|shop|io)\b)\S*/gi;
const HIDDEN = '[hidden]';

/** Hides contact details. Returns the cleaned text and whether anything was hidden. */
export function hideContactDetails(text: string): { text: string; hidden: boolean } {
  let hidden = false;
  const swap = (pattern: RegExp) => (current: string) => current.replace(pattern, () => { hidden = true; return HIDDEN; });
  const cleaned = [swap(EMAIL), swap(LINK), swap(PHONE), swap(LONG_NUMBER)].reduce((value, fn) => fn(value), text);
  return { text: cleaned, hidden };
}

export interface Thread { orderId: string | null; productId: string | null; buyerId: string; sellerId: string; title: string; reference: string | null }

/** Tells the other person, by email and WhatsApp, that they have a new message. Never throws. */
export async function relayMessage(thread: Thread, senderId: string, recipientId: string, body: string, messageId: string) {
  try {
    // at most one alert every few minutes per conversation, so a busy chat does not flood anyone
    const recent = await queryOne<{ id: string }>(
      `SELECT id FROM messages WHERE id <> $1 AND sender_id = $2 AND notified_at > now() - ($3 || ' minutes')::interval
         AND ((order_id IS NOT NULL AND order_id = $4) OR (product_id IS NOT NULL AND product_id = $5 AND buyer_id = $6)) LIMIT 1`,
      [messageId, senderId, String(NOTIFY_EVERY_MINUTES), thread.orderId, thread.productId, thread.buyerId]
    );
    if (recent) return;

    const people = await queryOne<{ s_name: string; s_business: string | null; s_role: string; r_email: string; r_phone: string; r_name: string; r_role: string; r_wa: boolean }>(
      `SELECT s.full_name AS s_name, s.business_name AS s_business, s.role AS s_role,
              r.email AS r_email, r.phone_number AS r_phone, r.full_name AS r_name, r.role AS r_role, r.whatsapp_opt_in AS r_wa
       FROM users s, users r WHERE s.id = $1 AND r.id = $2`,
      [senderId, recipientId]
    );
    if (!people) return;
    const sender = people.s_role === 'seller' ? people.s_business || people.s_name : people.s_name.split(' ')[0];
    const preview = body.length > 140 ? `${body.slice(0, 140)}…` : body;
    const link = thread.reference ? `${siteUrl()}/checkout/${thread.reference}` : `${siteUrl()}/messages`;
    const recipientLink = people.r_role === 'seller' && !thread.reference ? `${siteUrl()}/messages` : link;
    await queryOne('UPDATE messages SET notified_at = now() WHERE id = $1', [messageId]);
    await notifyUser(
      { email: people.r_email, phone_number: people.r_phone, full_name: people.r_name, role: people.r_role, whatsapp_opt_in: people.r_wa },
      `New message about ${thread.title}`,
      {
        title: `New message from ${sender}`,
        lines: [
          `${sender} sent you a message about ${thread.title}${thread.reference ? ` (order #${thread.reference})` : ''}:`,
          `“${preview}”`,
          `Reply on ${SITE.name}. Your phone number and email stay private: ${SITE.name} passes the messages between you.`,
        ],
        buttonText: 'Read and reply on Zemba',
        buttonUrl: recipientLink,
      },
      undefined,
      { event: 'MESSAGE', link: recipientLink, order_reference: thread.reference || undefined }
    );
  } catch (error) {
    console.error('Could not relay message:', error);
  }
}
