import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { 
      role, 
      full_name, 
      business_name, 
      phone_number, 
      email, 
      password, 
      momo_provider, 
      momo_number, 
      newsletter_opt_in, 
      nrc_number, 
      location 
    } = await req.json();

    if (!role || !['customer', 'seller'].includes(role) || !full_name || !phone_number || !email || !password) {
      return NextResponse.json({ error: 'role, name, phone, email and password are required' }, { status: 400 });
    }
    
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const approvalStatus = role === 'seller' ? 'PENDING' : 'APPROVED';
    const id = randomUUID();

    // Insert user into SQLite database
    db.prepare(`
      INSERT INTO users (id, role, full_name, business_name, phone_number, email, password_hash, momo_provider, momo_number, approval_status, user_category, newsletter_opt_in)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      role, 
      full_name, 
      business_name || null, 
      phone_number, 
      email, 
      hashedPassword, 
      momo_provider || null, 
      momo_number || null, 
      approvalStatus, 
      role.toUpperCase(), 
      newsletter_opt_in === false ? 0 : 1
    );
    
    // Save vendor verification details for sellers if provided
    if (role === 'seller' && nrc_number && location) {
      const verificationId = randomUUID();
      db.prepare(`
        INSERT INTO vendor_verification (id, user_id, nrc_number, location, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(verificationId, id, nrc_number, location);
    }
    
    return NextResponse.json({ id, role }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (String(error).includes('UNIQUE') || String(error).includes('constraint failed')) {
      return NextResponse.json({ error: 'Email or phone number is already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to create account' }, { status: 500 });
  }
}
