export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, computeFees, logEvent } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { customer_id } = await req.json();
    if (!customer_id) return NextResponse.json({ error: 'customer_id required' }, { status: 400 });

    // Fetch cart items with products
    const { data: items, error: cartError } = await supabase
      .from('cart_items')
      .select('quantity, products(*)')
      .eq('customer_id', customer_id);

    if (cartError || !items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const references: string[] = [];

    for (const item of items) {
      const product = item.products as any;
      const lineTotal = product.price * item.quantity;
      const { platform_fee, net_amount } = computeFees(lineTotal);
      const id = randomUUID();
      const order_reference = id.slice(0, 8).toUpperCase();

      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          id,
          order_reference,
          customer_id,
          seller_id: product.seller_id,
          product_id: product.id,
          quantity: item.quantity,
          amount: lineTotal,
          platform_fee,
          net_amount,
          status: 'PENDING_PAYMENT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      await logEvent(id, 'ORDER_CREATED', { product: product.title, quantity: item.quantity });
      references.push(order_reference);
    }

    // Delete cart items
    await supabase.from('cart_items').delete().eq('customer_id', customer_id);

    return NextResponse.json({ references });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create orders' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sellerId = req.nextUrl.searchParams.get('seller_id');
    
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    } else {
      query = query.limit(100);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    return NextResponse.json({ orders: rows || [] });
  } catch (error: any) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch orders' }, { status: 500 });
  }
}
