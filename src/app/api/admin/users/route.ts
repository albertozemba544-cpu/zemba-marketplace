export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { user_id, account_status, user_category, ban_reason } = await req.json();
    
    if (!user_id || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(account_status) || !user_category) {
      return NextResponse.json({ error: 'Valid user status and category are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .update({
        account_status,
        user_category,
        ban_reason: ban_reason || null,
      })
      .eq('id', user_id)
      .neq('role', 'admin');

    if (error) {
      return NextResponse.json({ error: 'User not found or admin accounts cannot be moderated' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('User update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
