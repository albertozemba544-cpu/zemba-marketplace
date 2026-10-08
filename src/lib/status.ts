// Friendly names and colours for order statuses (used by buyer, seller and admin pages).

export type Tone = 'ok' | 'wait' | 'bad' | 'info';

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: 'Waiting for payment', tone: 'wait' },
  FUNDS_SECURED: { label: 'Paid — waiting for seller to ship', tone: 'info' },
  DISPATCHED: { label: 'On its way', tone: 'info' },
  PENDING_ADMIN_REVIEW: { label: 'Under review by Zemba', tone: 'wait' },
  COMPLETED: { label: 'Completed', tone: 'ok' },
  REFUNDED: { label: 'Refunded', tone: 'bad' },
  DISPUTED: { label: 'Dispute open', tone: 'bad' },
};

export function statusInfo(status: string) {
  return ORDER_STATUS[status] ?? { label: status, tone: 'info' as Tone };
}
