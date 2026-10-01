export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { customer_id, product_id, quantity } = await req.json();

    if (!customer_id || !product_id) {
      return NextResponse.json({ error: 'customer_id and product_id are required' }, { status: 400 });
    }

    // Check if item already in cart
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (existing) {
      // Update quantity
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: (quantity || 1) })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insert new cart item
      const { error } = await supabase
        .from('cart_items')
        .insert({
          id: randomUUID(),
          customer_id,
          product_id,
          quantity: quantity || 1,
          created_at: new Date().toISOString(),
        });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Cart error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update cart' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const customer_id = req.nextUrl.searchParams.get('customer_id');

    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id required' }, { status: 400 });
    }

    const { data: items, error } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('customer_id', customer_id);

    if (error) throw error;

    return NextResponse.json({ items: items || [] });
  } catch (error: any) {
    console.error('Fetch cart error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { customer_id, product_id } = await req.json();

    if (!customer_id || !product_id) {
      return NextResponse.json({ error: 'customer_id and product_id are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('customer_id', customer_id)
      .eq('product_id', product_id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Delete cart item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete cart item' }, { status: 500 });
  }
}
