// Fee rules in one place. Pure functions: safe to use in pages and in API routes.
//
//  Seller commission  = feePercent of the item price, taken from the seller's payout
//  Buyer protection   = buyerFeePercent of the item price (minimum buyerFeeMin), added at checkout
//  Total the buyer pays = item price + buyer protection fee
//  Cancellation       = item price less the cancellation fee (the protection fee is not returned)
//  Seller failure     = full refund of everything the buyer paid

import { SITE } from './site';

const round2 = (value: number) => Math.round(value * 100) / 100;

export function sellerCommission(amount: number): number {
  return round2((amount * SITE.feePercent) / 100);
}

export function buyerProtectionFee(amount: number): number {
  return round2(Math.max((amount * SITE.buyerFeePercent) / 100, SITE.buyerFeeMin));
}

export function totalToPay(amount: number): number {
  return round2(amount + buyerProtectionFee(amount));
}

export function cancellationFee(amount: number): number {
  return round2(Math.min(amount, Math.max((amount * SITE.cancelFeePercent) / 100, SITE.cancelFeeMin)));
}

/** What the buyer gets back when they cancel a paid order before dispatch. */
export function cancellationRefund(amount: number): number {
  return round2(amount - cancellationFee(amount));
}

/** What the buyer gets back when the seller fails (no dispatch, not as described, dispute won). */
export function fullRefund(amount: number): number {
  return totalToPay(amount);
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
export function withBuyerFees<T extends { amount: number | string }>(order: T) {
  const amount = Number(order.amount);
  return {
    ...order,
    buyer_fee: buyerProtectionFee(amount),
    total_amount: totalToPay(amount),
    cancel_fee: cancellationFee(amount),
    cancel_refund: cancellationRefund(amount),
  };
}
