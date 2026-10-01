export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { randomUUID } from 'crypto';
import { saveUploadedImage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const sellerId = req.nextUrl.searchParams.get('seller_id');
    
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    } else {
      query = query.eq('status', 'ACTIVE').eq('approval_status', 'APPROVED');
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    return NextResponse.json({ products: rows || [] });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let seller_id: string;
    let title: string;
    let description: string;
    let price: number;
    let category: string;
    let stock: number;
    let image_url: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      seller_id = String(form.get('seller_id') || '');
      title = String(form.get('title') || '');
      description = String(form.get('description') || '');
      price = Number(form.get('price'));
      category = String(form.get('category') || '');
      stock = Number(form.get('stock') || 1);
      const image = form.get('image');
      if (image instanceof File && image.size > 0) {
        image_url = await saveUploadedImage(image);
      }
    } else {
      ({ seller_id, title, description, price, category, stock } = await req.json());
    }

    if (!seller_id || !title || !price) {
      return NextResponse.json({ error: 'seller_id, title and price are required' }, { status: 400 });
    }

    const id = randomUUID();

    // Check if seller exists and is approved
    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('approval_status')
      .eq('id', seller_id)
      .eq('role', 'seller')
      .maybeSingle();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller account not found' }, { status: 404 });
    }
    if (seller.approval_status !== 'APPROVED') {
      return NextResponse.json({ error: 'Your seller account is awaiting admin approval' }, { status: 403 });
    }

    // Insert product
    const { error: insertError } = await supabase
      .from('products')
      .insert({
        id,
        seller_id,
        title,
        description: description || '',
        price,
        category: category || 'General',
        stock: stock || 1,
        image_url,
        approval_status: 'PENDING',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
