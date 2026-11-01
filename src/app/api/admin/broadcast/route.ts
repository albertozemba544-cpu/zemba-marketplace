export const dynamic = 'force-dynamic';

// Updates to many people. Two kinds:
//   NEWS     - news and offers: only people who ticked "send me news"
//   SERVICE  - an important update (rules changed, safety): every active user
// The email is sent in small batches (see ./send) so it never times out.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { buildUpdateEmail } from '@/lib/broadcast';
import { isEmailConfigured, sendEmail } from '@/lib/notify';
import { fail, handleError } from '@/lib/http';

const KINDS = ['NEWS', 'SERVICE'];
const AUDIENCES = ['ALL', 'BUYERS', 'SELLERS'];

function audienceFilter(kind: string, audience: string): string {
  const parts = ["u.account_status = 'ACTIVE'", "u.role <> 'admin'", "u.email IS NOT NULL", "u.email <> ''"];
  if (kind === 'NEWS') parts.push('u.newsletter_opt_in = true');
  if (audience === 'BUYERS') parts.push("u.role = 'customer'");
  if (audience === 'SELLERS') parts.push("u.role = 'seller'");
  return parts.join(' AND ');
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const counts: Record<string, number> = {};
    for (const kind of KINDS) {
      for (const audience of AUDIENCES) {
        const row = await queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM users u WHERE ${audienceFilter(kind, audience)}`);
        counts[`${kind}_${audience}`] = row?.count ?? 0;
      }
    }
    const history = await query(
      `SELECT b.id, b.kind, b.audience, b.subject, b.total, b.sent, b.failed, b.status, b.created_at,
              (SELECT COUNT(*) FROM broadcast_recipients r WHERE r.broadcast_id = b.id AND r.status = 'PENDING') AS pending
       FROM broadcasts b ORDER BY b.created_at DESC LIMIT 20`
    );
    return NextResponse.json({ counts, history, email_ready: isEmailConfigured() });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const body = await req.json();

    // put failed recipients back in the queue
    if (body.action === 'retry_failed') {
      await queryOne("UPDATE broadcast_recipients SET status = 'PENDING', error = NULL WHERE broadcast_id = $1 AND status = 'FAILED'", [body.broadcast_id]);
      await queryOne("UPDATE broadcasts SET status = 'SENDING', failed = 0 WHERE id = $1", [body.broadcast_id]);
      return NextResponse.json({ ok: true });
    }

    const kind = String(body.kind || '');
    const audience = String(body.audience || 'ALL');
    const subject = String(body.subject || '').trim();
    const text = String(body.body || '').trim();
    const buttonText = String(body.button_text || '').trim().slice(0, 60);
    const buttonUrl = String(body.button_url || '').trim();
    if (!KINDS.includes(kind) || !AUDIENCES.includes(audience)) return fail('Choose who the email is for');
    if (subject.length < 3 || subject.length > 150) return fail('Write a subject (3 to 150 characters)');
    if (text.length < 10 || text.length > 5000) return fail('Write your message (at least 10 characters)');
    if (buttonUrl && (!/^https:\/\//i.test(buttonUrl) || !buttonText)) return fail('A button needs both a label and a link that starts with https://');
    if (!isEmailConfigured()) return fail('Email is not set up yet. Add the Brevo settings in Vercel first.', 503);

    const draft = { kind, subject, body: text, button_text: buttonText || null, button_url: buttonUrl || null };

    // "Send me a test" goes only to the admin
    if (body.action === 'test') {
      const me = await queryOne<{ id: string; email: string; full_name: string }>('SELECT id, email, full_name FROM users WHERE id = $1', [auth.user.id]);
      const ok = await sendEmail(me!.email, `[TEST] ${subject}`, buildUpdateEmail(draft, { user_id: me!.id, full_name: me!.full_name }));
      return ok ? NextResponse.json({ ok: true }) : fail('The test email could not be sent. Check your Brevo settings.', 502);
    }

    const created = await queryOne<{ id: string }>(
      `INSERT INTO broadcasts (kind, audience, subject, body, button_text, button_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [kind, audience, subject, text, draft.button_text, draft.button_url, auth.user.id]
    );
    await queryOne(
      `INSERT INTO broadcast_recipients (broadcast_id, user_id, email, full_name)
       SELECT $1, u.id, u.email, u.full_name FROM users u WHERE ${audienceFilter(kind, audience)}`,
      [created!.id]
    );
    const total = await queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM broadcast_recipients WHERE broadcast_id = $1', [created!.id]);
    await queryOne('UPDATE broadcasts SET total = $2, status = $3 WHERE id = $1', [created!.id, total?.count ?? 0, (total?.count ?? 0) === 0 ? 'DONE' : 'SENDING']);
    return NextResponse.json({ ok: true, broadcast_id: created!.id, total: total?.count ?? 0 }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
