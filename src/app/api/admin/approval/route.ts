export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, logEvent } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { entity, id, decision } = await req.json();
    
    if (!['user', 'product'].includes(entity) || !['APPROVED', 'REJECTED'].includes(decision) || !id) {
      return NextResponse.json({ error: 'Invalid approval request' }, { status: 400 });
    }

    const table = entity === 'user' ? 'users' : 'products';
    
    // Fetch the row to check if it exists
    const { data: row, error: fetchError } = await supabase
      .from(table)
      .select('id' + (entity === 'product' ? ', seller_id' : ''))
      .eq('id', id)
      .maybeSingle();
    
    if (fetchError || !row) {
      return NextResponse.json({ error: `${entity} not found` }, { status: 404 });
    }

    // Update approval status
    const { error: updateError } = await supabase
      .from(table)
      .update({ approval_status: decision })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    if (entity === 'product' && (row as any).seller_id) {
      // Update product status
      await supabase
        .from('products')
        .update({ status: decision === 'APPROVED' ? 'ACTIVE' : 'PAUSED' })
        .eq('id', id);

      // Find related order and log event
      const { data: eventOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (eventOrder) {
        await logEvent(eventOrder.id, 'PRODUCT_APPROVAL_UPDATED', { product_id: id, decision });
      }
    }

    return NextResponse.json({ ok: true, entity, id, decision });
  } catch (error: any) {
    console.error('Approval API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
