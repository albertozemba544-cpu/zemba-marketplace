import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { saveUploadedImage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const sellerId = req.nextUrl.searchParams.get('seller_id');
  const rows = sellerId
    ? db.prepare('SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC').all(sellerId)
    : db.prepare("SELECT * FROM products WHERE status = 'ACTIVE' AND approval_status = 'APPROVED' ORDER BY created_at DESC").all();
  return NextResponse.json({ products: rows });
}

export async function POST(req: NextRequest) {
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
    if (image instanceof File && image.size > 0) image_url = await saveUploadedImage(image);
  } else {
    ({ seller_id, title, description, price, category, stock } = await req.json());
  }

  if (!seller_id || !title || !price) {
    return NextResponse.json({ error: 'seller_id, title and price are required' }, { status: 400 });
  }
  const id = randomUUID();
  const seller = db.prepare('SELECT approval_status FROM users WHERE id = ? AND role = \'seller\'').get(seller_id) as { approval_status?: string } | undefined;
  if (!seller) return NextResponse.json({ error: 'Seller account not found' }, { status: 404 });
  if (seller.approval_status !== 'APPROVED') return NextResponse.json({ error: 'Your seller account is awaiting admin approval' }, { status: 403 });
  db.prepare(`
    INSERT INTO products (id, seller_id, title, description, price, category, stock, image_url, approval_status, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'ACTIVE')
  `).run(id, seller_id, title, description || '', price, category || 'General', stock ?? 1, image_url);

  return NextResponse.json({ id }, { status: 201 });
}
