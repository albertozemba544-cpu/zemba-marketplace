export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { subject, body, audience } = await req.json();

    if (!subject || !body) {
      return NextResponse.json({ error: 'subject and body are required' }, { status: 400 });
    }

    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert({
        subject,
        body,
        audience: audience || 'ALL',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Count active recipients opted into newsletters
    const { data: recipientData, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('newsletter_opt_in', true)
      .eq('account_status', 'ACTIVE');

    if (countError) {
      console.error('Error counting recipients:', countError);
    }

    const recipientCount = recipientData?.length || 0;

    return NextResponse.json({ ok: true, id: announcement.id, recipientCount }, { status: 201 });
  } catch (error: any) {
    console.error('Announcement error:', error);
    return NextResponse.json({ error: error.message || 'Unable to save announcement' }, { status: 500 });
  }
}
