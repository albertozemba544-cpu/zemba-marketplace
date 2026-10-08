// Order logic shared by several routes: notifications, payment confirmation and settlement.

import { randomInt } from 'crypto';
import { PoolClient } from 'pg';
import { logEvent, queryOne, withTransaction } from './db';
import { notifyUser } from './notify';
import { siteUrl } from './site';

interface NotifyOrder {
  amount: number;
  net_amount: number;
  reference: string;
}
interface Template {
  subject: string;
  text: (o: NotifyOrder, extra?: string) => string;
}

const money = (value: number) => `K${Number(value).toFixed(2)}`;

// Short messages: they are sent by email AND by SMS, so keep them under about 160 characters.
const TEMPLATES: Record<string, Template> = {
  FUNDS_SECURED: {
    subject: 'New paid order - please ship it',
    text: (o) => `Zemba: Order #${o.reference} is paid (${money(o.amount)}) and held in escrow. Please ship within 3 days and upload proof of dispatch.`,
  },
  PAYMENT_RECEIVED: {
    subject: 'Your payment is secured',
    text: (o) => `Zemba: Your payment for order #${o.reference} (${money(o.amount)}) is held safely in escrow. Your delivery code is on your order page.`,
  },
  DISPATCHED: {
    subject: 'Your order has been dispatched',
    text: (o, extra) => `Zemba: Order #${o.reference} has been dispatched${extra ? ` (${extra})` : ''}. When it arrives, enter your delivery code on the order page to release payment.`,
  },
  COMPLETED: {
    subject: 'Order completed',
    text: (o) => `Zemba: Order #${o.reference} is complete. Payment has been released to the seller. Thank you for shopping with us!`,
  },
  DELIVERY_CONFIRMED: {
    subject: 'Buyer confirmed delivery',
    text: (o) => `Zemba: The buyer confirmed delivery of order #${o.reference}. ${money(o.net_amount)} will be paid to your mobile money.`,
  },
  TRANSIT_WARNING: {
    subject: 'Please confirm your delivery',
    text: (o) => `Zemba: Order #${o.reference} is still marked as in transit. Confirm delivery, or extend your protection by 7 days, before the window closes.`,
  },
  DISPUTE_OPENED: {
    subject: 'A dispute was opened on your order',
    text: (o) => `Zemba: The buyer opened a dispute on order #${o.reference}. Please reply on the order page. Zemba will review it.`,
  },
  REFUND_BUYER: {
    subject: 'Your order was refunded',
    text: (o) => `Zemba: Order #${o.reference} was refunded. ${money(o.amount)} will be sent back to your mobile money.`,
  },
  REFUND_SELLER: {
    subject: 'An order was refunded to the buyer',
    text: (o) => `Zemba: Order #${o.reference} was refunded to the buyer, so no payout is due for it.`,
  },
  RELEASE_SELLER: {
    subject: 'Payment released to you',
    text: (o) => `Zemba: Funds for order #${o.reference} were released to you. ${money(o.net_amount)} will be paid to your mobile money.`,
  },
  RELEASE_BUYER: {
    subject: 'Your order was closed',
    text: (o) => `Zemba: After review, order #${o.reference} was closed and the payment released to the seller.`,
  },
  PAYOUT_SENT: {
    subject: 'Your payout was sent',
    text: (o, extra) => `Zemba: We paid ${money(o.net_amount)} for order #${o.reference} to your mobile money.${extra ? ` Ref: ${extra}` : ''}`,
  },
  REFUND_SENT: {
    subject: 'Your refund was sent',
    text: (o, extra) => `Zemba: We refunded ${money(o.amount)} for order #${o.reference} to your mobile money.${extra ? ` Ref: ${extra}` : ''}`,
  },
};

export const NOTIFICATION_TYPES = Object.keys(TEMPLATES);

/**
 * Saves a notification once per order/recipient/type and sends it by email and SMS.
 * Returns null if it was already sent before.
 */
export async function createNotification(
  orderId: string,
  recipientId: string,
  type: string,
  client?: PoolClient,
  extra?: string
) {
  const template = TEMPLATES[type];
  if (!template) return null;
  const order = await queryOne<{ amount: number; net_amount: number; reference: string }>(
    'SELECT amount, net_amount, order_reference AS reference FROM orders WHERE id = $1',
    [orderId]
  );
  if (!order) return null;
  const message = template.text(order, extra);
  const sql = `INSERT INTO order_notifications (order_id, recipient_id, notification_type, message)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (order_id, recipient_id, notification_type) DO NOTHING
               RETURNING id`;
  const params = [orderId, recipientId, type, message];
  const saved = client ? (await client.query(sql, params)).rows[0] : await queryOne<{ id: string }>(sql, params);
  if (!saved) return null;

  // Send it (never fails the request if the email or SMS provider is down).
  try {
    const recipient = await queryOne<{ email: string; phone_number: string; role: string; full_name: string; whatsapp_opt_in: boolean }>(
      'SELECT email, phone_number, role, full_name, whatsapp_opt_in FROM users WHERE id = $1',
      [recipientId]
    );
    if (recipient) {
      const base = siteUrl();
      const link =
        recipient.role === 'seller' ? `${base}/seller/dashboard` : recipient.role === 'admin' ? `${base}/admin/orders` : `${base}/checkout/${order.reference}`;
      await notifyUser(
        recipient,
        template.subject,
        { title: template.subject, lines: [message.replace(/^Zemba: /, '')], buttonText: 'Open on Zemba', buttonUrl: link },
        message,
        { event: type, link, order_reference: order.reference }
      );
    }
  } catch (error) {
    console.error('Could not deliver notification:', error);
  }
  return { id: saved.id as string, message };
}

/**
 * Moves an order from PENDING_PAYMENT to FUNDS_SECURED (called by the demo pay button
 * and by the real payment webhook). Returns the delivery code, or null if the order
 * was not waiting for payment.
 */
export async function markFundsSecured(
  order: { id: string; seller_id: string | null; customer_id?: string | null; product_id: string | null; quantity: number },
  transactionId: string,
  provider: string
) {
  const deliveryCode = String(randomInt(100000, 1000000));
  const secured = await withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE orders
         SET status = 'FUNDS_SECURED', gateway_transaction_id = $1, delivery_code = $2, updated_at = now()
       WHERE id = $3 AND status = 'PENDING_PAYMENT'
       RETURNING id`,
      [transactionId, deliveryCode, order.id]
    );
    if (updated.rowCount === 0) return false;
    if (order.product_id) {
      await client.query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [order.quantity, order.product_id]);
    }
    await logEvent(order.id, 'PAYMENT_SECURED', { provider, transaction_id: transactionId }, client);
    return true;
  });
  if (!secured) return null;
  if (order.seller_id) await createNotification(order.id, order.seller_id, 'FUNDS_SECURED').catch(() => null);
  if (order.customer_id) await createNotification(order.id, order.customer_id, 'PAYMENT_RECEIVED').catch(() => null);
  return deliveryCode;
}

/**
 * Closes an order for good: "release" pays the seller, "refund" returns the money to the buyer.
 * The payout / refund itself is sent by hand for now, so it is added to the admin "Money to move" list.
 * Run it inside a transaction; call notifySettlement() after the commit.
 */
export async function settleOrder(client: PoolClient, orderId: string, resolution: 'release' | 'refund') {
  const result = await client.query(
    `UPDATE orders
        SET status = $1::varchar,
            payout_status = CASE WHEN $2::text = 'release' THEN 'DUE' ELSE payout_status END,
            refund_status = CASE WHEN $2::text = 'refund' THEN 'DUE' ELSE refund_status END,
            updated_at = now()
      WHERE id = $3
      RETURNING id, customer_id, seller_id`,
    [resolution === 'release' ? 'COMPLETED' : 'REFUNDED', resolution, orderId]
  );
  return result.rows[0] as { id: string; customer_id: string | null; seller_id: string | null } | undefined;
}

export async function notifySettlement(order: { id: string; customer_id: string | null; seller_id: string | null }, resolution: 'release' | 'refund') {
  const tasks: Promise<unknown>[] = [];
  if (resolution === 'release') {
    if (order.seller_id) tasks.push(createNotification(order.id, order.seller_id, 'RELEASE_SELLER'));
    if (order.customer_id) tasks.push(createNotification(order.id, order.customer_id, 'RELEASE_BUYER'));
  } else {
    if (order.customer_id) tasks.push(createNotification(order.id, order.customer_id, 'REFUND_BUYER'));
    if (order.seller_id) tasks.push(createNotification(order.id, order.seller_id, 'REFUND_SELLER'));
  }
  await Promise.allSettled(tasks);
}
