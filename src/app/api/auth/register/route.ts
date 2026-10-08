export const dynamic = 'force-dynamic';

import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { isEmailConfigured, sendEmail } from '@/lib/notify';
import { createToken } from '@/lib/tokens';
import { siteUrl } from '@/lib/site';
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

    if (body.accept_terms !== true) {
      return fail('Please accept the Terms of Use, Privacy Policy and Refund Policy to create an account');
    }

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
    // When email sending is set up, people must click the link in their email before they can log in.
    const needsVerification = isEmailConfigured();

    const id = await withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO users (role, full_name, business_name, phone_number, email, password_hash,
                            momo_provider, momo_number, approval_status, user_category, newsletter_opt_in, email_verified_at, terms_accepted_at, whatsapp_opt_in)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CASE WHEN $12::boolean THEN NULL ELSE now() END, now(), $13)
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
          needsVerification,
          body.whatsapp_opt_in === true,
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

    if (needsVerification) {
      const token = await createToken(id, 'VERIFY_EMAIL', 60 * 24);
      const link = `${siteUrl(req)}/verify-email?token=${token}`;
      await sendEmail(email, 'Confirm your email address', {
        title: `Welcome to Zemba, ${full_name.split(' ')[0]}!`,
        lines: ['Please confirm your email address to finish creating your account. This link works for 24 hours.'],
        buttonText: 'Confirm my email',
        buttonUrl: link,
      });
    }

    return NextResponse.json({ id, role, approval_status: approvalStatus, needs_verification: needsVerification }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') {
      return fail('Email or phone number is already registered', 409);
    }
    return handleError(error, 'Unable to create account');
  }
}
