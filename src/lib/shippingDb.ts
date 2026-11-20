// Loads and saves a product's shipping prices.
import { query } from './db';
import { ShippingConfig, ShippingRate, toShippingConfig } from './shipping';

/** Shipping settings for several products at once (keyed by product id). */
export async function loadShippingConfigs(productIds: string[]): Promise<Map<string, ShippingConfig>> {
  const result = new Map<string, ShippingConfig>();
  if (productIds.length === 0) return result;
  const products = await query<{ id: string; shipping_mode: string; shipping_other_price: number | null }>(
    'SELECT id, shipping_mode, shipping_other_price FROM products WHERE id = ANY($1::uuid[])',
    [productIds]
  );
  const rates = await query<{ product_id: string; town: string; price: number }>(
    'SELECT product_id, town, price FROM product_shipping_rates WHERE product_id = ANY($1::uuid[]) ORDER BY town',
    [productIds]
  );
  for (const product of products) {
    result.set(product.id, toShippingConfig(product, rates.filter((rate) => rate.product_id === product.id)));
  }
  return result;
}

/** Saves a product's shipping settings inside a transaction. */
export async function saveShipping(
  client: { query: (text: string, params?: any[]) => Promise<any> },
  productId: string,
  mode: 'FREE' | 'BY_TOWN',
  otherPrice: number | null,
  rates: ShippingRate[]
) {
  await client.query('UPDATE products SET shipping_mode = $1, shipping_other_price = $2 WHERE id = $3', [mode, otherPrice, productId]);
  await client.query('DELETE FROM product_shipping_rates WHERE product_id = $1', [productId]);
  for (const rate of rates) {
    await client.query('INSERT INTO product_shipping_rates (product_id, town, price) VALUES ($1, $2, $3)', [productId, rate.town, rate.price]);
  }
}
