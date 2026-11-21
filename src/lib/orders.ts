// Order logic shared by several routes: notifications, payment confirmation and settlement.

import { randomInt } from 'crypto';
import { PoolClient } from 'pg';
import { logEvent, queryOne, withTransaction } from './db';
import { notifyUser } from './notify';
import { SITE, siteUrl } from './site';
import { cancellationRefund, fullRefund, sellerFailureCharge, totalToPay } from './fees';

interface NotifyOrder {
  amount: number; // item price
  net_amount: number; // what the seller is paid
  reference: string;
  total_amount: number; // what the buyer paid (item price + buyer protection fee)
  refund_amount: number; // what the buyer gets back
  cancelled: boolean; // true when the buyer cancelled before dispatch
  seller_charge: number; // refund charge the seller owes when the order was refunded because of them
  deduction: number; // refund charges taken off this order's payout
  title: string; // the item
  quantity: number;
  buyer_name: string; // buyer's first name
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_town: string | null;
  carrier_name: string | null;
  waybill_number: string | null; // the courier receipt number
  pickup_point: string | null;
}
interface Template {
  subject: string;
  details?: (o: NotifyOrder) => string[]; // extra lines for the email only (the SMS and WhatsApp text stays short)
  text: (o: NotifyOrder, extra?: string) => string;
}

const money = (value: number) => `K${Number(value).toFixed(2)}`;
const shortTitle = (title: string) => (title.length > 32 ? `${title.slice(0, 31)}…` : title);

// Short messages: they are sent by email AND by SMS, so keep them under about 160 characters.
const TEMPLATES: Record<string, Template> = {
  FUNDS_SECURED: {
    subject: 'New paid order - please ship it',
    text: (o) => `Zemba: New paid order #${o.reference}: ${o.quantity} x ${shortTitle(o.title)} for ${o.buyer_name}, delivery to ${o.delivery_town || 'the buyer'}. Ship within ${SITE.dispatchDays} days and upload the courier receipt.`,
    details: (o) => [
      `Item: ${o.quantity} x ${o.title}`,
      `Buyer: ${o.buyer_name}`,
      `Deliver to: ${o.delivery_town || '-'}${o.receiver_name ? `, collected by ${o.receiver_name}${o.receiver_phone ? ` (${o.receiver_phone})` : ''}` : ''}`,
      `Paid and held in escrow: ${money(o.amount)} for the item. You receive ${money(o.net_amount)} (the item price less Zemba's commission, plus any shipping) when the buyer confirms delivery.`,
      `Next: ship it within ${SITE.dispatchDays} days, then mark it as dispatched with a photo of the courier receipt and the receipt (waybill) number. We send those to the buyer so they can collect the parcel.`,
      'You can message the buyer from the order page. Zemba passes your messages on.',
    ],
  },
  PAYMENT_RECEIVED: {
    subject: 'Your payment is secured',
    text: (o) => `Zemba: Your payment for order #${o.reference} (${money(o.total_amount)}) is held safely in escrow. Your delivery code is on your order page.`,
    details: (o) => [
      `Item: ${o.quantity} x ${o.title}`,
      `Total paid: ${money(o.total_amount)}, held in escrow until you confirm delivery.`,
      `Keep your delivery code private. Only enter it on Zemba once you have collected the parcel and are happy with it.`,
      'You can message the seller from the order page. Zemba passes your messages on.',
    ],
  },
  DISPATCHED: {
    subject: 'Your order is on its way',
    text: (o) =>
      `Zemba: Order #${o.reference} is on its way${o.carrier_name ? ` with ${o.carrier_name}` : ''}. Courier receipt (waybill) no. ${o.waybill_number || 'on your order page'}${o.pickup_point ? `. Collect at ${o.pickup_point}` : ''}. Take the receipt number when you collect it.`,
    details: (o) => [
      `Item: ${o.quantity} x ${o.title}`,
      `Courier: ${o.carrier_name || '-'}`,
      `Courier receipt (waybill) number: ${o.waybill_number || '-'}. You need this number to collect your parcel.`,
      `Collect at: ${o.pickup_point || '-'}`,
      'A photo of the receipt is on your order page.',
      'When the parcel arrives and is as described, enter your delivery code on the order page. That releases the payment to the seller.',
      'If something is wrong, do not enter the code. Message the seller or open a dispute from the order page.',
    ],
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
    text: (o) =>
      o.cancelled
        ? `Zemba: Order #${o.reference} was cancelled. ${money(o.refund_amount)} (the item price less the cancellation fee) will be sent back to your mobile money.`
        : `Zemba: Order #${o.reference} was refunded. ${money(o.refund_amount)} will be sent back to your mobile money.`,
  },
  ORDER_CANCELLED: {
    subject: 'The buyer cancelled an order',
    text: (o) => `Zemba: The buyer cancelled order #${o.reference} before dispatch. Please do not send it. No payout is due for this order.`,
  },
  REFUND_SELLER: {
    subject: 'An order was refunded to the buyer',
    text: (o) => `Zemba: Order #${o.reference} was refunded to the buyer, so no payout is due for it. A refund charge of ${money(o.seller_charge)} will be deducted from your next payout, as set out in the Terms.`,
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
    text: (o, extra) =>
      o.deduction >= o.net_amount
        ? `Zemba: The ${money(o.net_amount)} payout for order #${o.reference} was used to cover ${money(o.deduction)} of refund charges from earlier orders, so nothing was sent this time.`
        : o.deduction > 0
          ? `Zemba: We paid ${money(o.net_amount - o.deduction)} for order #${o.reference} to your mobile money (${money(o.net_amount)} less ${money(o.deduction)} of refund charges from earlier orders).${extra ? ` Ref: ${extra}` : ''}`
          : `Zemba: We paid ${money(o.net_amount)} for order #${o.reference} to your mobile money.${extra ? ` Ref: ${extra}` : ''}`,
  },
  REFUND_SENT: {
    subject: 'Your refund was sent',
    text: (o, extra) => `Zemba: We refunded ${money(o.refund_amount)} for order #${o.reference} to your mobile money.${extra ? ` Ref: ${extra}` : ''}`,
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
  const row = await queryOne<Omit<NotifyOrder, 'total_amount' | 'refund_amount' | 'seller_charge'> & { shipping_amount: number; cancelled: boolean }>(
    `SELECT o.amount, o.shipping_amount, o.net_amount, o.order_reference AS reference, o.quantity, o.delivery_town, o.receiver_name, o.receiver_phone,
            o.carrier_name, o.waybill_number, o.pickup_point,
            COALESCE(p.title, 'your item') AS title, split_part(b.full_name, ' ', 1) AS buyer_name,
            EXISTS (SELECT 1 FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'BUYER_CANCELLED') AS cancelled,
            COALESCE((SELECT SUM((e.payload->>'amount')::numeric) FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'SELLER_CHARGE_DEDUCTED'), 0) AS deduction
     FROM orders o LEFT JOIN products p ON p.id = o.product_id LEFT JOIN users b ON b.id = o.customer_id WHERE o.id = $1`,
    [orderId]
  );
  if (!row) return null;
  const itemPrice = Number(row.amount);
  const shipping = Number(row.shipping_amount || 0);
  const order: NotifyOrder = {
    ...row,
    amount: itemPrice,
    net_amount: Number(row.net_amount),
    deduction: Number(row.deduction),
    seller_charge: sellerFailureCharge(itemPrice),
    total_amount: totalToPay(itemPrice, shipping),
    refund_amount: row.cancelled ? cancellationRefund(itemPrice, shipping) : fullRefund(itemPrice, shipping),
  };
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
        { title: template.subject, lines: [message.replace(/^Zemba: /, ''), ...(template.details ? template.details(order) : [])], buttonText: 'Open on Zemba', buttonUrl: link },
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
  let soldOut: { title: string; seller_id: string } | null = null;
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
      const before = await client.query('SELECT stock, title, seller_id FROM products WHERE id = $1 FOR UPDATE', [order.product_id]);
      const row = before.rows[0];
      await client.query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [order.quantity, order.product_id]);
      if (row && row.stock > 0 && row.stock - order.quantity <= 0) soldOut = { title: row.title as string, seller_id: row.seller_id as string };
    }
    await logEvent(order.id, 'PAYMENT_SECURED', { provider, transaction_id: transactionId }, client);
    return true;
  });
  if (!secured) return null;
  if (order.seller_id) await createNotification(order.id, order.seller_id, 'FUNDS_SECURED').catch(() => null);
  if (order.customer_id) await createNotification(order.id, order.customer_id, 'PAYMENT_RECEIVED').catch(() => null);
  if (soldOut) await notifySoldOut(soldOut).catch(() => null);
  return deliveryCode;
}

/**
 * Closes an order for good: "release" pays the seller, "refund" returns the money to the buyer (in full, including the buyer protection fee).
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


/** Tells the seller (by email) that one of their listings just sold out and is now hidden from the shop. */
async function notifySoldOut(item: { title: string; seller_id: string }) {
  const seller = await queryOne<any>('SELECT email, phone_number, full_name, role, whatsapp_opt_in FROM users WHERE id = $1', [item.seller_id]);
  if (!seller) return;
  const link = `${siteUrl()}/seller/dashboard`;
  const subject = `Sold out: ${item.title}`;
  const lines = [
    `Good news: "${item.title}" has just sold out, so it is now hidden from the shop.`,
    'If you have more to sell, change the stock number on the listing and it will show again straight away.',
  ];
  await notifyUser(seller, subject, { title: subject, lines, buttonText: 'Open my dashboard', buttonUrl: link }, `Zemba: "${item.title}" sold out. Add stock on your dashboard to show it again.`, { event: 'PRODUCT_SOLD_OUT', link });
}
