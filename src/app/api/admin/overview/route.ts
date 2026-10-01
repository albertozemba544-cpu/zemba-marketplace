export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    // Fetch users with vendor verification
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*, vendor_verification(*)')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Fetch products with seller info
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*, users(business_name, full_name)')
      .order('created_at', { ascending: false });

    if (productsError) throw productsError;

    // Fetch orders with product and seller info
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, products(title), users(business_name, full_name)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (ordersError) throw ordersError;

    // Fetch disputes with order info
    const { data: disputes, error: disputesError } = await supabase
      .from('disputes')
      .select('*, orders(order_reference, status)')
      .order('created_at', { ascending: false });

    if (disputesError) throw disputesError;

    // Fetch transaction events with order info
    const { data: events, error: eventsError } = await supabase
      .from('transaction_events')
      .select('*, orders(order_reference)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (eventsError) throw eventsError;

    // Fetch announcements
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (announcementsError) throw announcementsError;

    // Count newsletter subscribers
    const { data: subscribers, error: subscribersError, count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('newsletter_opt_in', true)
      .eq('account_status', 'ACTIVE');

    if (subscribersError) throw subscribersError;

    return NextResponse.json({
      users: users || [],
      products: products || [],
      orders: orders || [],
      disputes: disputes || [],
      events: events || [],
      announcements: announcements || [],
      newsletterSubscribers: count || 0,
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
