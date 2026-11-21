// Finds which conversation a request is about, and checks the person is allowed to see it.
import { queryOne } from './db';
import type { Thread } from './messages';

type Person = { id: string; role: string };
type Result = { thread: Thread; readOnly: boolean } | { error: string; status: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveThread(user: Person, input: { order?: string | null; product?: string | null; buyer?: string | null }): Promise<Result> {
  if (input.order) {
    const order = await queryOne<{ id: string; order_reference: string; customer_id: string; seller_id: string | null; product_id: string | null; title: string | null }>(
      `SELECT o.id, o.order_reference, o.customer_id, o.seller_id, o.product_id, p.title
       FROM orders o LEFT JOIN products p ON p.id = o.product_id WHERE o.order_reference = $1`,
      [String(input.order).slice(0, 40)]
    );
    if (!order || !order.seller_id) return { error: 'Order not found', status: 404 };
    const isParty = user.id === order.customer_id || user.id === order.seller_id;
    if (!isParty && user.role !== 'admin') return { error: 'Order not found', status: 404 };
    return {
      readOnly: !isParty, // admins can read an order's messages (for disputes) but not write in them
      thread: { orderId: order.id, productId: null, buyerId: order.customer_id, sellerId: order.seller_id, title: order.title || 'your order', reference: order.order_reference },
    };
  }

  if (input.product && UUID.test(input.product)) {
    const product = await queryOne<{ id: string; title: string; seller_id: string }>('SELECT id, title, seller_id FROM products WHERE id = $1', [input.product]);
    if (!product) return { error: 'Product not found', status: 404 };
    if (user.id === product.seller_id) {
      // the seller replies to one buyer who has already written to them
      if (!input.buyer || !UUID.test(input.buyer)) return { error: 'Choose a conversation', status: 400 };
      const started = await queryOne<{ id: string }>('SELECT id FROM messages WHERE product_id = $1 AND buyer_id = $2 LIMIT 1', [product.id, input.buyer]);
      if (!started) return { error: 'Conversation not found', status: 404 };
      return { readOnly: false, thread: { orderId: null, productId: product.id, buyerId: input.buyer, sellerId: product.seller_id, title: product.title, reference: null } };
    }
    if (user.role !== 'customer') return { error: 'Only buyers can write to a seller', status: 403 };
    return { readOnly: false, thread: { orderId: null, productId: product.id, buyerId: user.id, sellerId: product.seller_id, title: product.title, reference: null } };
  }
  return { error: 'Choose an order or a product', status: 400 };
}
