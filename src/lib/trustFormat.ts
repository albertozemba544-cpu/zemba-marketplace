// Safe to import from pages (no database code in here).

export const MIN_ORDERS_FOR_SCORE = 5;

export interface SellerTrust {
  verified: boolean;
  member_since: string | null;
  paid_orders: number;
  completed: number;
  disputes: number;
  disputes_lost: number;
  no_ship_refunds: number;
  avg_dispatch_hours: number | null;
}

export function formatDispatchTime(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return 'Not enough data yet';
  if (hours < 1) return 'Under 1 hour';
  if (hours < 24) {
    const h = Math.round(hours);
    return `About ${h} hour${h === 1 ? '' : 's'}`;
  }
  const days = hours / 24;
  return `About ${days < 10 ? days.toFixed(1).replace(/\.0$/, '') : Math.round(days)} days`;
}

export function percent(part: number, whole: number): string {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}
