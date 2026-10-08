export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';
import { siteUrl } from '@/lib/site';
import { fail, handleError, isUuid } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { entity, id, decision } = await req.json();
    if (!['user', 'product'].includes(entity) || !['APPROVED', 'REJECTED'].includes(decision) || !isUuid(id)) {
      return fail('Invalid approval request');
    }

    let changed: number;
    if (entity === 'user') {
      changed = await execute("UPDATE users SET approval_status = $1 WHERE id = $2 AND role <> 'admin'", [decision, id]);
    } else {
      const status = decision === 'APPROVED' ? 'ACTIVE' : 'PAUSED';
      // quick-link products stay LINK_ONLY so they never appear in the public marketplace
      changed = await execute(
        "UPDATE products SET approval_status = $1, status = CASE WHEN status = 'LINK_ONLY' THEN status WHEN status = 'REMOVED' THEN status ELSE $2::text END WHERE id = $3",
        [decision, status, id]
      );
    }
    if (!changed) return fail(`${entity} not found`, 404);

    // Tell the seller (email + SMS). Never blocks the approval if sending fails.
    try {
      const base = siteUrl(req);
      if (entity === 'user') {
        const person = await queryOne<{ email: string; phone_number: string; role: string; full_name: string }>(
          'SELECT email, phone_number, role, full_name FROM users WHERE id = $1',
          [id]
        );
        if (person && person.role === 'seller') {
          const ok = decision === 'APPROVED';
          const subject = ok ? 'Your seller account is approved' : 'Your seller application was not approved';
          const text = ok
            ? `Zemba: Welcome ${person.full_name}! Your seller account is approved. You can now log in and add products.`
            : 'Zemba: Sorry, your seller application was not approved. Contact Zemba support if you think this is a mistake.';
          await notifyUser(person, subject, { title: subject, lines: [text.replace(/^Zemba: /, '')], buttonText: ok ? 'Log in to sell' : undefined, buttonUrl: ok ? `${base}/seller/login` : undefined }, text);
        }
      } else {
        const owner = await queryOne<{ email: string; phone_number: string; title: string; status: string }>(
          `SELECT u.email, u.phone_number, p.title, p.status FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = $1`,
          [id]
        );
        if (owner && owner.status !== 'LINK_ONLY') {
          const ok = decision === 'APPROVED';
          const subject = ok ? 'Your listing is live' : 'Your listing was not approved';
          const text = ok ? `Zemba: Your listing "${owner.title}" is approved and now live.` : `Zemba: Your listing "${owner.title}" was not approved. Edit it and it will be reviewed again.`;
          await notifyUser(owner, subject, { title: subject, lines: [text.replace(/^Zemba: /, '')], buttonText: 'Open seller dashboard', buttonUrl: `${base}/seller/dashboard` }, text);
        }
      }
    } catch (error) {
      console.error('Approval notification failed:', error);
    }

    return NextResponse.json({ ok: true, entity, id, decision });
  } catch (error) {
    return handleError(error);
  }
}
