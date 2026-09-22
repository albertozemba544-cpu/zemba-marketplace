import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { role, full_name, business_name, phone_number, email, password, momo_provider, momo_number, newsletter_opt_in, nrc_number, location } = await req.json();
    
    if (!role || !['customer', 'seller'].includes(role) || !full_name || !phone_number || !email || !password) {
      return NextResponse.json({ error: 'role, name, phone, email and password are required' }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const approvalStatus = role === 'seller' ? 'PENDING' : 'APPROVED';
    const id = randomUUID();
    const newsletterValue = newsletter_opt_in === false ? 0 : 1;

    // Insert user into Supabase PostgreSQL database asynchronously
    await db.query(
      `INSERT INTO users (id, role, full_name, business_name, phone_number, email, password_hash, momo_provider, momo_number, approval_status, user_category, newsletter_opt_in)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, role, full_name, business_name || null, phone_number, email, hashedPassword, momo_provider || null, momo_number || null, approvalStatus, role.toUpperCase(), newsletterValue]
    );
    
    // Save vendor verification details for sellers if provided
    if (role === 'seller' && nrc_number && location) {
      const verificationId = randomUUID();
      await db.query(
        `INSERT INTO vendor_verification (id, user_id, nrc_number, location, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [verificationId, id, nrc_number, location]
      );
    }
    
    return NextResponse.json({ id, role }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505' || String(error).includes('UNIQUE')) {
      return NextResponse.json({ error: 'Email or phone number is already registered' }, { status: 409 });
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Unable to create account' }, { status: 500 });
  }
}
