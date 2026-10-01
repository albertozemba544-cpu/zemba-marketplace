export const dynamic = 'force-dynamic';

import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
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

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
    }

    // Check if phone number already exists
    const { data: existingPhone, error: phoneCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phone_number)
      .maybeSingle();

    if (phoneCheckError && phoneCheckError.code !== 'PGRST116') {
      throw phoneCheckError;
    }

    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number is already registered' }, { status: 409 });
    }

    // Insert user into Supabase
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id,
        role,
        full_name,
        business_name: business_name || null,
        phone_number,
        email,
        password_hash: hashedPassword,
        momo_provider: momo_provider || null,
        momo_number: momo_number || null,
        approval_status: approvalStatus,
        user_category: role.toUpperCase(),
        newsletter_opt_in: newsletter_opt_in === false ? false : true,
        account_status: 'ACTIVE',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Registration insert error:', insertError);
      return NextResponse.json({ error: 'Unable to create account' }, { status: 500 });
    }

    // Save vendor verification details for sellers if provided
    if (role === 'seller' && nrc_number && location) {
      const verificationId = randomUUID();
      await supabase
        .from('vendor_verification')
        .insert({
          id: verificationId,
          user_id: id,
          nrc_number,
          location,
          created_at: new Date().toISOString(),
        });
    }
    
    return NextResponse.json({ id, role }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Unable to create account' }, { status: 500 });
  }
}
