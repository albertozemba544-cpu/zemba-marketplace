// Shipping: the seller sets the price per town when they list an item. The buyer pays it with the item.
//
//  FREE     shipping is included in the price (the seller delivers anywhere they send to)
//  BY_TOWN  a price per town, plus (optionally) one price for every other town. A price of 0 means free to that town.
//
// Pure functions: used by the seller form, the product page, the cart and the server when an order is created.

export interface ShippingRate { town: string; price: number }
export interface ShippingConfig {
  mode: 'FREE' | 'BY_TOWN';
  otherPrice: number | null; // null = the seller does not deliver to towns that are not in the list
  rates: ShippingRate[];
}
export interface ShippingQuote { available: boolean; price: number; reason?: string }

export const MAX_RATES = 60;
export const MAX_SHIPPING_PRICE = 10000;

export const normalizeTown = (town: string) => town.trim().toLowerCase().replace(/\s+/g, ' ');

/** What shipping costs to deliver this item to a town. */
export function shippingFor(config: ShippingConfig, town: string): ShippingQuote {
  if (config.mode !== 'BY_TOWN') return { available: true, price: 0 };
  const wanted = normalizeTown(town || '');
  if (!wanted) return { available: false, price: 0, reason: 'Choose your town to see the shipping price.' };
  const match = config.rates.find((rate) => normalizeTown(rate.town) === wanted);
  if (match) return { available: true, price: Math.round(match.price * 100) / 100 };
  if (config.otherPrice !== null && config.otherPrice !== undefined) {
    return { available: true, price: Math.round(Number(config.otherPrice) * 100) / 100 };
  }
  return { available: false, price: 0, reason: 'This seller does not deliver to that town.' };
}

/** Turns a database row (plus its rates) into a ShippingConfig. */
export function toShippingConfig(row: { shipping_mode?: string | null; shipping_other_price?: number | string | null }, rates: { town: string; price: number | string }[]): ShippingConfig {
  return {
    mode: row.shipping_mode === 'BY_TOWN' ? 'BY_TOWN' : 'FREE',
    otherPrice: row.shipping_other_price === null || row.shipping_other_price === undefined ? null : Number(row.shipping_other_price),
    rates: rates.map((rate) => ({ town: rate.town, price: Number(rate.price) })),
  };
}

/** Checks what a seller typed into the shipping form. Returns an error message, or the clean values. */
export function parseShippingInput(input: { mode?: unknown; other?: unknown; rates?: unknown }):
  { error: string } | { mode: 'FREE' | 'BY_TOWN'; otherPrice: number | null; rates: ShippingRate[] } {
  const mode = input.mode === 'BY_TOWN' ? 'BY_TOWN' : 'FREE';
  if (mode === 'FREE') return { mode, otherPrice: null, rates: [] };

  let raw: any[] = [];
  try { raw = typeof input.rates === 'string' ? JSON.parse(input.rates || '[]') : Array.isArray(input.rates) ? input.rates : []; } catch { return { error: 'The shipping prices could not be read. Please try again.' }; }
  if (raw.length > MAX_RATES) return { error: `You can add up to ${MAX_RATES} towns` };

  const seen = new Set<string>();
  const rates: ShippingRate[] = [];
  for (const row of raw) {
    const town = String(row?.town || '').trim();
    if (!town) continue;
    if (town.length < 2 || town.length > 80) return { error: `"${town}" is not a valid town name` };
    const key = normalizeTown(town);
    if (seen.has(key)) return { error: `"${town}" is in your shipping list twice` };
    seen.add(key);
    const price = Number(row?.price ?? 0);
    if (!Number.isFinite(price) || price < 0 || price > MAX_SHIPPING_PRICE) return { error: `Enter a shipping price between K0 and K${MAX_SHIPPING_PRICE} for ${town}` };
    rates.push({ town, price: Math.round(price * 100) / 100 });
  }

  let otherPrice: number | null = null;
  const otherText = input.other === null || input.other === undefined ? '' : String(input.other).trim();
  if (otherText !== '') {
    otherPrice = Number(otherText);
    if (!Number.isFinite(otherPrice) || otherPrice < 0 || otherPrice > MAX_SHIPPING_PRICE) return { error: `Enter a shipping price between K0 and K${MAX_SHIPPING_PRICE} for other towns` };
    otherPrice = Math.round(otherPrice * 100) / 100;
  }
  if (rates.length === 0 && otherPrice === null) return { error: 'Add at least one town with a shipping price, or a price for all other towns' };
  return { mode, otherPrice, rates };
}
