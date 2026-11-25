// The holding rules in one place.
//
//   Day 0                payment secured
//   within 3 days        the seller must dispatch, or the buyer is refunded in full
//   dispatch             the seller says how many days the item needs to arrive (1 to 8)
//   delivery window ends the buyer has 3 more days to check the item
//   automatic release    if the buyer has not confirmed or opened a dispute, the money goes to the seller
//   14 days              the absolute limit: the money is never held longer than 14 days after payment
//                        (3 to dispatch + 8 to arrive + 3 to check = 14)
//
// An open dispute stops the clock. Zemba then decides (or the buyer and seller agree).

import { SITE } from './site';

const DAY = 24 * 60 * 60 * 1000;

/** When the money is released by itself, given when it was paid, when it was dispatched and the delivery window. */
export function autoReleaseAt(paidAt: Date, dispatchedAt: Date, transitDays: number): Date {
  const wanted = dispatchedAt.getTime() + (transitDays + SITE.reviewDays) * DAY;
  const limit = paidAt.getTime() + SITE.maxHoldDays * DAY;
  return new Date(Math.min(wanted, limit));
}

/** The latest moment the money can ever be held for this order. */
export function holdLimit(paidAt: Date): Date {
  return new Date(paidAt.getTime() + SITE.maxHoldDays * DAY);
}

/** Moves the release date later by the extension, but never past the 14-day limit. Returns null if there is no room left. */
export function extendedRelease(current: Date, paidAt: Date): Date | null {
  const limit = holdLimit(paidAt).getTime();
  if (current.getTime() >= limit) return null;
  return new Date(Math.min(current.getTime() + SITE.extendDays * DAY, limit));
}

/** "Thursday 3 December, 08:00" in Zambia time. Used in emails and on the order page. */
export function formatWhen(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lusaka' });
}
