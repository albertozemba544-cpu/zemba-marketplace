export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireUser } from '@/lib/auth';
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
        "UPDATE products SET approval_status = $1, status = CASE WHEN status = 'LINK_ONLY' THEN status ELSE $2::text END WHERE id = $3",
        [decision, status, id]
      );
    }
    if (!changed) return fail(`${entity} not found`, 404);
    return NextResponse.json({ ok: true, entity, id, decision });
  } catch (error) {
    return handleError(error);
  }
}
