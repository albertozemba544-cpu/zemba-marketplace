export const dynamic = 'force-dynamic';

import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { fail, handleError } from '@/lib/http';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = body.role;
    const full_name = String(body.full_name || '').trim();
    const business_name = String(body.business_name || '').trim();
    const phone_number = String(body.phone_number || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const momo_provider = String(body.momo_provider || '').toUpperCase();
    const momo_number = String(body.momo_number || '').trim();
    const nrc_number = String(body.nrc_number || '').trim();
    const location = String(body.location || '').trim();

    if (!['customer', 'seller'].includes(role) || !full_name || !phone_number || !email || !password) {
      return fail('Role, name, phone, email and password are required');
    }
    if (!EMAIL_RE.test(email)) return fail('Please enter a valid email address');
    if (phone_number.length < 7 || phone_number.length > 20) return fail('Please enter a valid phone number');
    if (password.length < 8) return fail('Password must be at least 8 characters');

    if (role === 'seller') {
      if (!business_name || !momo_number || !nrc_number || !location) {
        return fail('Business name, NRC number, location and mobile money number are required for sellers');
      }
      if (!['MTN', 'AIRTEL'].includes(momo_provider)) return fail('Choose MTN or Airtel for mobile money');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const approvalStatus = role === 'seller' ? 'PENDING' : 'APPROVED';

    const id = await withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO users (role, full_name, business_name, phone_number, email, password_hash,
                            momo_provider, momo_number, approval_status, user_category, newsletter_opt_in)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          role,
          full_name,
          role === 'seller' ? business_name : null,
          phone_number,
          email,
          passwordHash,
          role === 'seller' ? momo_provider : null,
          role === 'seller' ? momo_number : null,
          approvalStatus,
          role.toUpperCase(),
          body.newsletter_opt_in !== false,
        ]
      );
      const userId = inserted.rows[0].id as string;
      if (role === 'seller') {
        await client.query('INSERT INTO vendor_verification (user_id, nrc_number, location) VALUES ($1, $2, $3)', [
          userId,
          nrc_number,
          location,
        ]);
      }
      return userId;
    });

    return NextResponse.json({ id, role, approval_status: approvalStatus }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') {
      return fail('Email or phone number is already registered', 409);
    }
    return handleError(error, 'Unable to create account');
  }
}
