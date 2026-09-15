import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

const NOTIFICATION_TEMPLATES: Record<string, (data: any) => string> = {
  FUNDS_SECURED: (data) => `Funds of K${data.amount} secured in escrow for Order #${data.reference}. Please ship within 5 days.`,
  DISPATCHED: (data) => `Your order #${data.reference} has been dispatched! Track it and confirm delivery to release funds.`,
  COMPLETED: (data) => `Order #${data.reference} completed! Funds have been released to the seller.`,
  DELIVERY_CONFIRMED: (data) => `Buyer confirmed delivery for order #${data.reference}. Funds (K${data.amount}) released to your wallet.`,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const order_id = searchParams.get('order_id');
  const notification_type = searchParams.get('type');

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  try {
    let query = `SELECT * FROM order_notifications WHERE order_id = ?`;
    const params: any[] = [order_id];

    if (notification_type) {
      query += ` AND notification_type = ?`;
      params.push(notification_type);
    }

    const notifications = db.prepare(query + ` ORDER BY sent_at DESC`).all(...params);
    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: 'Unable to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { order_id, recipient_id, notification_type } = await req.json();

  if (!order_id || !recipient_id || !notification_type) {
    return NextResponse.json({ error: 'order_id, recipient_id, and notification_type are required' }, { status: 400 });
  }

  try {
    // Check if this notification has already been sent
    const existing = db.prepare(`
      SELECT id FROM order_notifications 
      WHERE order_id = ? AND recipient_id = ? AND notification_type = ?
    `).get(order_id, recipient_id, notification_type);

    if (existing) {
      return NextResponse.json({ message: 'Notification already sent' });
    }

    // Get order details for template
    const order = db.prepare(`
      SELECT id, amount, order_reference FROM orders WHERE id = ?
    `).get(order_id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get notification template
    const template = NOTIFICATION_TEMPLATES[notification_type];
    if (!template) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    const message = template(order);

    // Insert notification record
    const notification_id = randomUUID();
    db.prepare(`
      INSERT INTO order_notifications (id, order_id, recipient_id, notification_type, sent_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(notification_id, order_id, recipient_id, notification_type);

    // TODO: In production, integrate with:
    // - Africa's Talking API (SMS)
    // - WhatsApp Business API
    // - Email service

    return NextResponse.json({
      notification_id,
      message,
      type: notification_type,
      note: 'In production, this would send SMS/WhatsApp/Email via Africa\'s Talking API',
    }, { status: 201 });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: 'Unable to send notification' }, { status: 500 });
  }
}
