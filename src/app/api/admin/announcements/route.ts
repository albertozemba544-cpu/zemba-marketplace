export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { subject, body, audience } = await req.json();
    
    if (!subject || !body) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const id = randomUUID();
    
    // Insert announcement into database
    db.prepare('INSERT INTO announcements (id, subject, body, audience) VALUES (?, ?, ?, ?)').run(
      id, 
      subject, 
      body, 
      audience || 'ALL'
    );
    
    // Count active recipients opted into newsletters
    const recipients = db.prepare("SELECT COUNT(*) as count FROM users WHERE newsletter_opt_in = 1 AND account_status = 'ACTIVE'").get() as { count: number };
    
    return NextResponse.json({ ok: true, id, recipientCount: recipients.count }, { status: 201 });
  } catch (error: any) {
    console.error('Announcements API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
