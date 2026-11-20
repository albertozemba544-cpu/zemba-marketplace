// Fee rules in one place. Pure functions: safe to use in pages and in API routes.
//
//  Seller commission  = feePercent of the item price only (not shipping), taken from the seller's payout
//  Shipping           = chosen by the seller per town; the buyer pays it at checkout and it goes to the seller
//  Buyer protection   = buyerFeePercent of (item price + shipping), minimum buyerFeeMin, added at checkout
//  Total the buyer pays = item price + shipping + buyer protection fee
//  Cancellation       = item price less the cancellation fee, plus the shipping (the protection fee is not returned)
//  Seller failure     = full refund of everything the buyer paid

import { SITE } from './site';

const round2 = (value: number) => Math.round(value * 100) / 100;

export function sellerCommission(amount: number): number {
  return round2((amount * SITE.feePercent) / 100);
}

/** Buyer protection fee on the item price plus any shipping. */
export function buyerProtectionFee(amount: number, shipping = 0): number {
  return round2(Math.max(((amount + shipping) * SITE.buyerFeePercent) / 100, SITE.buyerFeeMin));
}

/** Everything the buyer pays for an order: item + shipping + buyer protection fee. */
export function totalToPay(amount: number, shipping = 0): number {
  return round2(amount + shipping + buyerProtectionFee(amount, shipping));
}

export function cancellationFee(amount: number): number {
  return round2(Math.min(amount, Math.max((amount * SITE.cancelFeePercent) / 100, SITE.cancelFeeMin)));
}

/** What the buyer gets back when they cancel a paid order before dispatch: item price less the fee, plus the shipping. */
export function cancellationRefund(amount: number, shipping = 0): number {
  return round2(amount - cancellationFee(amount) + shipping);
}

/** What the buyer gets back when the seller fails (no dispatch, not as described, dispute won). */
export function fullRefund(amount: number, shipping = 0): number {
  return totalToPay(amount, shipping);
}

/** Charge to a seller when an order is refunded because of them (not shipped, not as described, dispute lost). */
export function sellerFailureCharge(amount: number): number {
  return round2(Math.min(amount, Math.max((amount * SITE.sellerChargePercent) / 100, SITE.sellerChargeMin)));
}

export function meetsMinimumOrder(amount: number): boolean {
  return amount >= SITE.minOrder;
}

export function kwacha(value: number): string {
  const n = Number(value) || 0;
  return `K${Number.isInteger(n) ? n.toString() : n.toFixed(2)}`;
}

/** Adds the buyer-side figures to an order row so every page shows the same numbers. */
export function withBuyerFees<T extends { amount: number | string; shipping_amount?: number | string | null }>(order: T) {
  const amount = Number(order.amount);
  const shipping = Number(order.shipping_amount || 0);
  return {
    ...order,
    shipping_amount: shipping,
    buyer_fee: buyerProtectionFee(amount, shipping),
    total_amount: totalToPay(amount, shipping),
    cancel_fee: cancellationFee(amount),
    cancel_refund: cancellationRefund(amount, shipping),
  };
}
