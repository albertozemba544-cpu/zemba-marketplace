export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { reference: string } }) {
  const { reference } = params;

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, products(title), users(business_name, full_name)')
      .eq('order_reference', reference)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Unable to fetch order' }, { status: 500 });
  }
}
