export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, logEvent } from '@/lib/db';

export async function GET() {
  try {
    const { data: disputes, error } = await supabase
      .from('disputes')
      .select('*, orders(order_reference, amount, status)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ disputes: disputes || [] });
  } catch (error: any) {
    console.error('Failed to fetch disputes:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { dispute_id, resolution, admin_notes } = await req.json();
    
    if (!dispute_id || !resolution) {
      return NextResponse.json({ error: 'Dispute ID and resolution are required' }, { status: 400 });
    }

    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', dispute_id)
      .maybeSingle();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const newOrderStatus = resolution === 'refund' ? 'REFUNDED' : 'COMPLETED';
    const newDisputeStatus = resolution === 'refund' ? 'RESOLVED_REFUND' : 'RESOLVED_RELEASE';

    // Update order status
    await supabase
      .from('orders')
      .update({ status: newOrderStatus, updated_at: new Date().toISOString() })
      .eq('id', dispute.order_id);

    // Update dispute status
    await supabase
      .from('disputes')
      .update({ status: newDisputeStatus, admin_notes: admin_notes || '', resolved_at: new Date().toISOString() })
      .eq('id', dispute_id);

    await logEvent(dispute.order_id, 'DISPUTE_RESOLVED', { resolution, admin_notes });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Failed to resolve dispute:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
