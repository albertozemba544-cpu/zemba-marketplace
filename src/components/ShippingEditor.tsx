'use client';

import { ZAMBIA_TOWNS } from '@/lib/towns';

// The "Delivery and shipping" part of the seller's listing form.
// Sellers know what the bus or courier costs to each town, so they set it here and the buyer pays it with the item.

export interface ShippingForm {
  mode: 'FREE' | 'BY_TOWN';
  rates: { town: string; price: string }[];
  other: string; // price for all other towns; empty = no delivery to other towns
}

export const emptyShipping: ShippingForm = { mode: 'FREE', rates: [{ town: '', price: '' }], other: '' };

export function shippingToForm(shipping: { mode: string; otherPrice: number | null; rates: { town: string; price: number }[] } | undefined): ShippingForm {
  if (!shipping || shipping.mode !== 'BY_TOWN') return { ...emptyShipping, rates: [{ town: '', price: '' }] };
  return {
    mode: 'BY_TOWN',
    rates: shipping.rates.length ? shipping.rates.map((r) => ({ town: r.town, price: String(r.price) })) : [{ town: '', price: '' }],
    other: shipping.otherPrice === null || shipping.otherPrice === undefined ? '' : String(shipping.otherPrice),
  };
}

export function appendShipping(form: FormData, shipping: ShippingForm) {
  form.set('shipping_mode', shipping.mode);
  form.set('shipping_other', shipping.mode === 'BY_TOWN' ? shipping.other : '');
  form.set('shipping_rates', JSON.stringify(shipping.mode === 'BY_TOWN' ? shipping.rates.filter((r) => r.town.trim()).map((r) => ({ town: r.town.trim(), price: r.price === '' ? 0 : Number(r.price) })) : []));
}

export default function ShippingEditor({ value, onChange }: { value: ShippingForm; onChange: (next: ShippingForm) => void }) {
  const setRate = (index: number, patch: Partial<{ town: string; price: string }>) =>
    onChange({ ...value, rates: value.rates.map((r, i) => (i === index ? { ...r, ...patch } : r)) });

  return (
    <div className="zemba-field" style={{ marginTop: '0.4rem' }}>
      <strong>Delivery and shipping</strong>
      <p className="zemba-muted" style={{ margin: '0.2rem 0 0.6rem' }}>You know what the bus or courier costs. Tell buyers, and they pay it together with the item. You receive the shipping money with your payout, and Zemba takes no commission on it.</p>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <input type="radio" name="ship-mode" checked={value.mode === 'FREE'} onChange={() => onChange({ ...value, mode: 'FREE' })} style={{ marginTop: 4 }} />
        <span><strong>Free shipping.</strong> The shipping cost is already in my price, wherever I send it.</span>
      </label>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
        <input type="radio" name="ship-mode" checked={value.mode === 'BY_TOWN'} onChange={() => onChange({ ...value, mode: 'BY_TOWN' })} style={{ marginTop: 4 }} />
        <span><strong>Shipping depends on the town.</strong> I set the price for each town.</span>
      </label>

      {value.mode === 'BY_TOWN' && (
        <div style={{ padding: '0.8rem', border: '1px solid #dfe7e2', borderRadius: 10 }}>
          <datalist id="zemba-ship-towns">{ZAMBIA_TOWNS.map((t) => <option key={t} value={t} />)}</datalist>
          <p className="zemba-muted" style={{ margin: '0 0 0.5rem' }}>Shipping price per town. Enter 0 for free shipping to a town.</p>
          {value.rates.map((rate, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <input className="zemba-input" style={{ margin: 0, flex: 2 }} list="zemba-ship-towns" placeholder="Town, e.g. Kitwe" value={rate.town} onChange={(e) => setRate(index, { town: e.target.value })} maxLength={80} />
              <input className="zemba-input" style={{ margin: 0, flex: 1 }} type="number" min="0" step="0.01" placeholder="K price" value={rate.price} onChange={(e) => setRate(index, { price: e.target.value })} />
              <button type="button" aria-label="Remove town" onClick={() => onChange({ ...value, rates: value.rates.length > 1 ? value.rates.filter((_, i) => i !== index) : [{ town: '', price: '' }] })} style={{ background: 'none', border: 0, color: '#b42318', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <button type="button" className="zemba-btn zemba-btn-secondary" onClick={() => onChange({ ...value, rates: [...value.rates, { town: '', price: '' }] })}>+ Add another town</button>

          <label className="zemba-field" style={{ marginTop: '0.9rem' }}>Price for all other towns (optional)
            <input className="zemba-input" type="number" min="0" step="0.01" placeholder="Leave empty if you do not deliver to other towns" value={value.other} onChange={(e) => onChange({ ...value, other: e.target.value })} />
          </label>
          <p className="zemba-muted" style={{ margin: 0 }}>If you leave this empty, buyers in towns that are not in your list cannot order this item.</p>
        </div>
      )}
    </div>
  );
}
