// Order logic shared by several routes.

import { randomInt } from 'crypto';
import { PoolClient } from 'pg';
import { logEvent, queryOne, withTransaction } from './db';

const TEMPLATES: Record<string, (o: { amount: number; reference: string }) => string> = {
  FUNDS_SECURED: (o) => `Funds of K${o.amount} secured in escrow for Order #${o.reference}. Please ship within 3 days.`,
  DISPATCHED: (o) => `Your order #${o.reference} has been dispatched! Track it and confirm delivery to release funds.`,
  COMPLETED: (o) => `Order #${o.reference} completed! Funds have been released to the seller.`,
  DELIVERY_CONFIRMED: (o) => `Buyer confirmed delivery for order #${o.reference}. Funds (K${o.amount}) released to your wallet.`,
};

export const NOTIFICATION_TYPES = Object.keys(TEMPLATES);

/** Saves a notification once per order/recipient/type. Returns null if it was already sent. */
export async function createNotification(orderId: string, recipientId: string, type: string, client?: PoolClient) {
  const template = TEMPLATES[type];
  if (!template) return null;
  const order = await queryOne<{ amount: number; reference: string }>(
    'SELECT amount, order_reference AS reference FROM orders WHERE id = $1',
    [orderId]
  );
  if (!order) return null;
  const message = template(order);
  const sql = `INSERT INTO order_notifications (order_id, recipient_id, notification_type, message)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (order_id, recipient_id, notification_type) DO NOTHING
               RETURNING id`;
  const params = [orderId, recipientId, type, message];
  const result = client ? (await client.query(sql, params)).rows[0] : await queryOne<{ id: string }>(sql, params);
  // TODO: send the message by SMS / WhatsApp here (Africa's Talking).
  return result ? { id: result.id as string, message } : null;
}

/**
 * Moves an order from PENDING_PAYMENT to FUNDS_SECURED (called by the demo pay button
 * and by the real payment webhook). Returns the delivery code, or null if the order
 * was not waiting for payment.
 */
export async function markFundsSecured(order: { id: string; seller_id: string | null; product_id: string | null; quantity: number }, transactionId: string, provider: string) {
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
  return deliveryCode;
}
