// Automatic listing checks. Listings go live straight away. A listing is only FLAGGED (hidden until the admin
// looks at it) when it trips one of these rules. Edit the lists below to suit your market.

import { queryOne } from './db';

// Words that should never appear in a listing on Zemba. A match hides the listing until an admin checks it.
export const BLOCKED_TERMS: Record<string, string[]> = {
  'Weapons': ['gun', 'guns', 'rifle', 'pistol', 'firearm', 'firearms', 'ammunition', 'ammo', 'grenade', 'explosive', 'explosives'],
  'Illegal drugs': ['cocaine', 'heroin', 'marijuana', 'cannabis', 'mandrax', 'methamphetamine', 'ecstasy'],
  'Counterfeit or stolen goods': ['counterfeit', 'replica', 'stolen', 'knockoff', 'knock-off', 'fake'],
  'Adult content': ['porn', 'nude', 'escort', 'sex toy', 'sex toys'],
  'Protected wildlife': ['ivory', 'pangolin', 'rhino horn'],
  'Money schemes': ['forex', 'ponzi', 'pyramid scheme', 'get rich quick', 'investment opportunity'],
};

// Signs that someone is trying to take the buyer away from Zemba (and away from escrow protection)
const OFF_PLATFORM = [
  /(?:\+?260|\b0)[\s-]?[79]\d[\s-]?\d{3}[\s-]?\d{4}/i, // a Zambian phone number
  /https?:\/\//i,
  /\bwww\./i,
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/i, // an email address
  /\bwhats\s?app\b/i,
  /\b(pay me|send (me )?money|send to my|mobile money|airtel money|mtn money|dm me|inbox me|call me)\b/i,
];

export const HIGH_PRICE_LIMIT = 50000; // listings above this amount (in kwacha) are checked by an admin
export const MAX_NEW_LISTINGS_PER_HOUR = 10;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Returns the reasons a listing should be flagged. An empty list means it can go live. */
export async function checkListing(
  sellerId: string,
  listing: { title: string; description: string; price: number },
  options: { checkVolume?: boolean } = {}
): Promise<string[]> {
  const reasons: string[] = [];
  const text = `${listing.title} ${listing.description}`.toLowerCase();

  for (const [group, words] of Object.entries(BLOCKED_TERMS)) {
    const hit = words.find((word) => new RegExp(`(^|[^a-z])${escapeRegExp(word)}([^a-z]|$)`, 'i').test(text));
    if (hit) reasons.push(`${group} ("${hit}")`);
  }
  if (OFF_PLATFORM.some((pattern) => pattern.test(`${listing.title} ${listing.description}`))) {
    reasons.push('Contact details or a request to pay outside Zemba');
  }
  if (listing.price > HIGH_PRICE_LIMIT) reasons.push(`High-value item (over K${HIGH_PRICE_LIMIT.toLocaleString('en-GB')})`);
  if (listing.price < 1) reasons.push('Price is under K1');

  if (options.checkVolume !== false) {
    try {
      const recent = await queryOne<{ count: number }>(
        "SELECT COUNT(*) AS count FROM products WHERE seller_id = $1 AND created_at > now() - interval '1 hour'",
        [sellerId]
      );
      if ((recent?.count ?? 0) >= MAX_NEW_LISTINGS_PER_HOUR) reasons.push('Many listings added within one hour');

      // Optional dial: check the first N listings of every new seller (0 = off, which is the default)
      const firstN = Number(process.env.MODERATION_REVIEW_FIRST_LISTINGS || 0);
      if (firstN > 0) {
        const total = await queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM products WHERE seller_id = $1', [sellerId]);
        if ((total?.count ?? 0) < firstN) reasons.push('New seller: first listings are checked');
      }
    } catch (error) {
      console.error('Listing volume check failed:', error);
    }
  }
  return reasons;
}
