export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logEvent, queryOne, execute } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { saveUploadedImage } from '@/lib/storage';
import { createNotification } from '@/lib/orders';
import { fail, handleError, isUuid } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['seller']);
  if ('res' in auth) return auth.res;
  try {
    const form = await req.formData();
    const orderId = String(form.get('order_id') || '');
    const transitDays = Number(form.get('transit_days') || 14);
    const proof = form.get('proof');
    const carrierName = String(form.get('carrier_name') || '').trim();
    const waybillNumber = String(form.get('waybill_number') || '').trim();
    const pickupPoint = String(form.get('pickup_point') || '').trim();

    if (!isUuid(orderId) || !Number.isInteger(transitDays) || transitDays < 1 || transitDays > 60) {
      return fail('Valid order and transit window (1-60 days) are required');
    }
    if (!(proof instanceof File) || proof.size === 0) return fail('Proof of dispatch is required');
    if (carrierName.length < 2 || carrierName.length > 100) return fail('Choose the bus company or courier you used');
    if (waybillNumber.length < 3 || waybillNumber.length > 60) return fail('Enter the waybill or tracking number');
    if (pickupPoint.length < 3 || pickupPoint.length > 200) return fail('Enter where the buyer should collect the item');

    const order = await queryOne<any>('SELECT * FROM orders WHERE id = $1 AND seller_id = $2', [orderId, auth.user.id]);
    if (!order) return fail('Order not found', 404);
    if (order.status !== 'FUNDS_SECURED') return fail('Only secured orders can be dispatched', 409);

    let waybillImageUrl: string;
    try {
      waybillImageUrl = await saveUploadedImage(proof, 'dispatch');
    } catch (error) {
      return fail((error as Error).message, 400);
    }

    const changed = await execute(
      `UPDATE orders
         SET status = 'DISPATCHED', waybill_image_url = $1, timeout_days = $2,
             carrier_name = $4, waybill_number = $5, pickup_point = $6,
             timeout_warning_sent_at = NULL, updated_at = now()
       WHERE id = $3 AND status = 'FUNDS_SECURED'`,
      [waybillImageUrl, transitDays, orderId, carrierName, waybillNumber, pickupPoint]
    );
    if (!changed) return fail('Only secured orders can be dispatched', 409);

    await logEvent(orderId, 'DISPATCHED', { transit_days: transitDays, waybill_image_url: waybillImageUrl, carrier: carrierName, waybill_number: waybillNumber, pickup_point: pickupPoint });
    if (order.customer_id) await createNotification(orderId, order.customer_id, 'DISPATCHED', undefined, `${carrierName}, waybill ${waybillNumber}, collect at ${pickupPoint}`).catch(() => null);
    return NextResponse.json({ ok: true, waybill_image_url: waybillImageUrl });
  } catch (error) {
    return handleError(error);
  }
}
