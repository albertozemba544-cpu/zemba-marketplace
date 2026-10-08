export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { optionalUser } from '@/lib/auth';
import { sendEmail } from '@/lib/notify';
import { SITE } from '@/lib/site';
import { fail, handleError } from '@/lib/http';

// Contact form on /contact. Saved in the "suggestions" table (see Admin -> Messages) and emailed to you.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // hidden "website" field: real people leave it empty, spam bots fill it in
    if (body.website) return NextResponse.json({ ok: true });

    const name = String(body.name || '').trim().slice(0, 100);
    const phone = String(body.phone || '').trim().slice(0, 30);
    const email = String(body.email || '').trim().slice(0, 150);
    const message = String(body.message || '').trim().slice(0, 2000);
    if (!name || message.length < 5) return fail('Please enter your name and a message');
    if (!phone && !email) return fail('Please give a phone number or an email so we can reply');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail('Please enter a valid email address');

    const user = await optionalUser(req);
    const details = `From: ${name}\nPhone: ${phone || '-'}\nEmail: ${email || '-'}\n\n${message}`;
    await execute('INSERT INTO suggestions (user_id, subject, message) VALUES ($1, $2, $3)', [user?.id ?? null, `Contact: ${name}`.slice(0, 120), details]);

    const owner = process.env.ADMIN_ALERT_EMAIL || SITE.email;
    if (owner) await sendEmail(owner, `New message from ${name}`, { title: 'New contact message', lines: details.split('\n').filter(Boolean) }).catch(() => false);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
