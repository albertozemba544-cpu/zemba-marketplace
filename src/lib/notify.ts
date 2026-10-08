// Sends emails and SMS messages. Everything here is "best effort": if a provider is not
// configured, or a message fails, the website carries on and just logs the problem.
//
// EMAIL  - set BREVO_API_KEY (or RESEND_API_KEY) and EMAIL_FROM_ADDRESS (+ optional EMAIL_FROM_NAME)
// WHATSAPP (via n8n) - set NOTIFY_WEBHOOK_URL (+ NOTIFY_WEBHOOK_SECRET). Only people who ticked the WhatsApp box are sent.
// SMS    - set AT_USERNAME and AT_API_KEY (Africa's Talking), optional AT_SENDER_ID, AT_SANDBOX=true

import crypto from 'crypto';
import { SITE } from './site';

const TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function isEmailConfigured(): boolean {
  return Boolean((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && process.env.EMAIL_FROM_ADDRESS);
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.AT_USERNAME && process.env.AT_API_KEY) && process.env.SMS_ENABLED !== 'false';
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface EmailContent {
  title: string;
  lines: string[];
  buttonText?: string;
  buttonUrl?: string;
}

export function renderEmailHtml(content: EmailContent): string {
  const paragraphs = content.lines
    .map((line) => `<p style="margin:0 0 14px;color:#14261d;font-size:15px;line-height:1.6">${escapeHtml(line)}</p>`)
    .join('');
  const button =
    content.buttonText && content.buttonUrl
      ? `<p style="margin:22px 0"><a href="${escapeHtml(content.buttonUrl)}" style="background:#12894d;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${escapeHtml(content.buttonText)}</a></p>`
      : '';
  return `<!doctype html><html><body style="margin:0;background:#f4f8f5;padding:24px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe7e2">
<tr><td style="background:#0b3d2c;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:700">${escapeHtml(SITE.name)}</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 16px;font-size:20px;color:#0b3d2c">${escapeHtml(content.title)}</h1>${paragraphs}${button}
<p style="margin:24px 0 0;color:#6d8277;font-size:12px">You are receiving this because of activity on your ${escapeHtml(SITE.name)} account.</p></td></tr>
</table></td></tr></table></body></html>`;
}

export function renderEmailText(content: EmailContent): string {
  return [content.title, '', ...content.lines, content.buttonUrl ? `\n${content.buttonText ?? 'Open'}: ${content.buttonUrl}` : ''].join('\n');
}

/** Returns true if the provider accepted the email. */
export async function sendEmail(to: string, subject: string, content: EmailContent): Promise<boolean> {
  if (!isEmailConfigured() || !to) return false;
  const address = process.env.EMAIL_FROM_ADDRESS as string;
  const name = process.env.EMAIL_FROM_NAME || SITE.name;
  const html = renderEmailHtml(content);
  const text = renderEmailText(content);
  try {
    let response: Response;
    if (process.env.BREVO_API_KEY) {
      response = await fetchWithTimeout('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sender: { name, email: address }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
      });
    } else {
      response = await fetchWithTimeout('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${name} <${address}>`, to: [to], subject, html, text }),
      });
    }
    if (!response.ok) {
      console.error('Email provider rejected the message:', response.status, (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

/** Turns 097 123 4567, 260971234567 or +260971234567 into +260971234567. Returns null if it does not look like a phone number. */
export function normalizeZmPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('260')) digits = digits;
  else if (digits.startsWith('0')) digits = `260${digits.slice(1)}`;
  else if (digits.length === 9) digits = `260${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? `+${digits}` : null;
}

/** Returns true if Africa's Talking accepted the message. */
export async function sendSms(to: string | null | undefined, message: string): Promise<boolean> {
  if (!isSmsConfigured()) return false;
  const phone = normalizeZmPhone(to);
  if (!phone) return false;
  const host = process.env.AT_SANDBOX === 'true' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
  const body = new URLSearchParams({ username: process.env.AT_USERNAME as string, to: phone, message: message.slice(0, 300) });
  if (process.env.AT_SENDER_ID) body.set('from', process.env.AT_SENDER_ID);
  try {
    const response = await fetchWithTimeout(`https://${host}/version1/messaging`, {
      method: 'POST',
      headers: { apiKey: process.env.AT_API_KEY as string, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      console.error('SMS provider rejected the message:', response.status, (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
}

/** Sends one message to your own webhook (for example an n8n workflow that talks to WhatsApp). Never throws. */
export async function sendWebhook(payload: Record<string, unknown>): Promise<boolean> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return false;
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.NOTIFY_WEBHOOK_SECRET) {
    headers['X-Zemba-Signature'] = crypto.createHmac('sha256', process.env.NOTIFY_WEBHOOK_SECRET).update(body).digest('hex');
  }
  try {
    const response = await fetchWithTimeout(url, { method: 'POST', headers, body });
    if (!response.ok) {
      console.error('Notification webhook rejected the message:', response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Notification webhook failed:', error);
    return false;
  }
}

/** Email + SMS (+ WhatsApp webhook for people who opted in) to one person. Never throws. */
export async function notifyUser(
  user: { email?: string | null; phone_number?: string | null; full_name?: string | null; role?: string | null; whatsapp_opt_in?: boolean | null },
  subject: string,
  content: EmailContent,
  smsText?: string,
  hook?: { event: string; link?: string; order_reference?: string }
): Promise<void> {
  await Promise.allSettled([
    user.whatsapp_opt_in && hook && process.env.NOTIFY_WEBHOOK_URL
      ? sendWebhook({
          channel: 'whatsapp',
          event: hook.event,
          to: normalizeZmPhone(user.phone_number),
          name: user.full_name || null,
          role: user.role || null,
          message: (smsText || content.lines.join(' ')).replace(/^Zemba: /, ''),
          link: hook.link || null,
          order_reference: hook.order_reference || null,
          site: SITE.name,
          sent_at: new Date().toISOString(),
        })
      : Promise.resolve(false),
    user.email ? sendEmail(user.email, subject, content) : Promise.resolve(false),
    smsText ? sendSms(user.phone_number, smsText) : Promise.resolve(false),
  ]);
}
