import { NextRequest, NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/db';
import { saveUploadedImage } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const orderId = String(form.get('order_id') || '');
  const sellerId = String(form.get('seller_id') || '');
  const transitDays = Number(form.get('transit_days') || 14);
  const proof = form.get('proof');
  if (!orderId || !sellerId || !Number.isInteger(transitDays) || transitDays < 1 || transitDays > 60) {
    return NextResponse.json({ error: 'Valid order, seller and transit window are required' }, { status: 400 });
  }
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json({ error: 'Proof of dispatch is required' }, { status: 400 });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND seller_id = ?').get(orderId, sellerId) as any;
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'FUNDS_SECURED') return NextResponse.json({ error: 'Only secured orders can be dispatched' }, { status: 409 });

  try {
    const waybillImageUrl = await saveUploadedImage(proof);
    db.prepare(`
      UPDATE orders SET status = 'DISPATCHED', waybill_image_url = ?, timeout_days = ?, timeout_warning_sent_at = NULL,
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'FUNDS_SECURED'
    `).run(waybillImageUrl, transitDays, orderId);
    logEvent(orderId, 'DISPATCHED', { transit_days: transitDays, waybill_image_url: waybillImageUrl });
    return NextResponse.json({ ok: true, waybill_image_url: waybillImageUrl });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}