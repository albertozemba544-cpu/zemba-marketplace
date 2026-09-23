import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    } = body;

    // Validation
    if (!role || !full_name || !phone_number || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const approvalStatus = role.toLowerCase() === 'seller' ? 'pending' : 'approved';
    const newsletterValue = newsletter_opt_in ? 1 : 0;

    // Insert user into database asynchronously using type assertion for query support
    await (db as any).query(
      `INSERT INTO users (id, role, full_name, business_name, phone_number, email, password_hash, momo_provider, momo_number, approval_status, user_category, newsletter_opt_in)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
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
        newsletterValue,
      ]
    );

    return NextResponse.json(
      { message: 'User registered successfully', userId: id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
