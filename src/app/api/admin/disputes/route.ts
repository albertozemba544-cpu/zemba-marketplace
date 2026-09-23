export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/db';

export async function GET() {
  try {
    const disputes = db.prepare(`
      SELECT disputes.*, orders.order_reference, orders.amount, orders.status as order_status
      FROM disputes JOIN orders ON orders.id = disputes.order_id
      ORDER BY disputes.created_at DESC
    `).all();
    return NextResponse.json({ disputes });
  } catch (error: any) {
    console.error('Failed to fetch disputes:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Admin resolves a dispute: refund the buyer or release to the seller.
    const { dispute_id, resolution, admin_notes } = await req.json();
    
    if (!dispute_id || !resolution) {
      return NextResponse.json({ error: 'Dispute ID and resolution are required' }, { status: 400 });
    }

    const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(dispute_id) as any;
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const newOrderStatus = resolution === 'refund' ? 'REFUNDED' : 'COMPLETED';
    const newDisputeStatus = resolution === 'refund' ? 'RESOLVED_REFUND' : 'RESOLVED_RELEASE';

    db.prepare(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newOrderStatus, dispute.order_id);
    db.prepare(`UPDATE disputes SET status = ?, admin_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(newDisputeStatus, admin_notes || '', dispute_id);

    logEvent(dispute.order_id, 'DISPUTE_RESOLVED', { resolution, admin_notes });
    // TODO: trigger actual refund or payout call to the gateway here.

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Failed to resolve dispute:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
