// Company details, contact details and fee rules used across the whole website.
// The fee rules here feed the checkout, the order pages, the legal pages and the admin figures.

export const SITE = {
  name: 'Zemba Marketplace',
  description: 'Escrow-backed marketplace for Zambia — buy, sell, and never get scammed.',
  phone: '+260 76 891 4518',
  whatsapp: '260768914518', // digits only, with country code
  email: 'aztechinnovations@yahoo.com',
  hours: 'Monday to Saturday, 08:00 – 17:00 (CAT)',
  location: 'Zambia',

  // ---- Company ----
  legalName: 'AZTECH Innovations',
  registrationNumber: '320261082033', // PACRA registration number
  address: '', // registered office address; leave empty to hide it
  legalUpdated: '20 November 2026', // shown on the legal pages

  // ---- Fees and order rules ----
  feePercent: 8, // seller commission: % of the item price (shipping is not charged commission), taken from the seller's payout
  buyerFeePercent: 4, // buyer protection fee: % of the item price plus shipping...
  buyerFeeMin: 3, // ...with this minimum in kwacha per order
  cancelFeePercent: 5, // fee when a buyer cancels a paid order before dispatch: % of the item price...
  cancelFeeMin: 5, // ...with this minimum in kwacha
  minOrder: 30, // smallest item value of one order, in kwacha
  dispatchDays: 3, // days a seller has to dispatch a paid order
  sellerChargePercent: 5, // charge to a seller when an order is refunded because of them: % of the item price...
  sellerChargeMin: 5, // ...with this minimum in kwacha. It is deducted automatically from their payouts.
  sellerChargesFrom: '2026-11-19', // refunds before this date carry no seller charge
};

/** The public address of the website, e.g. https://zemba-marketplace.vercel.app */
export function siteUrl(req?: { nextUrl?: { origin: string } }): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/\$/, '');
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) return `https://${vercelHost}`;
  return req?.nextUrl?.origin ?? 'http://localhost:3000';
}

/** A "chat on WhatsApp" link, or '' if no WhatsApp number is set above. */
export function whatsappLink(message = 'Hello Zemba Marketplace, I need help with...'): string {
  const digits = SITE.whatsapp.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '';
}