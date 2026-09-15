import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { seller_id, product_id, title, price } = await req.json();
  if (!seller_id || !title || !price) {
    return NextResponse.json({ error: 'seller_id, title, and price are required' }, { status: 400 });
  }
  const seller = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'seller'").get(seller_id);
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
  const linkId = randomUUID().slice(0, 8).toUpperCase();
  db.prepare(`
    INSERT INTO quick_links (id, seller_id, product_id, title, price, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(linkId, seller_id, product_id || null, title, price);
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
  const shareUrl = `${baseUrl}/quick-pay/${linkId}`;
  return NextResponse.json({ link_id: linkId, share_url: shareUrl, qr_code: null }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const linkId = req.nextUrl.searchParams.get('link_id');
  if (!linkId) return NextResponse.json({ error: 'link_id required' }, { status: 400 });
  const link = db.prepare('SELECT * FROM quick_links WHERE id = ?').get(linkId);
  return link ? NextResponse.json({ link }) : NextResponse.json({ error: 'Link not found' }, { status: 404 });
}
