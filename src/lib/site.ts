// ✏️ EDIT THIS FILE - put your real contact details in the quotes below.
// Anything you leave empty ('') is simply hidden on the Contact page.

export const SITE = {
  name: 'Zemba Marketplace',
  description: 'Escrow-backed marketplace for Zambia — buy, sell, and never get scammed.',
  phone: '+260 77 190 2162', // e.g. '+260 97 123 4567'
  whatsapp: '260771902162', // digits only, with country code, e.g. '260971234567'
  email: 'albertozemba11@gmail.com', // e.g. 'support@yourdomain.com'
  hours: 'Monday to Saturday, 08:00 – 17:00 (CAT)',
  location: 'Zambia',

  // ---- Used by the Terms, Privacy and Refund pages. Check every line with your lawyer. ----
  legalName: 'Zemba Tech', // the registered name of the business that runs the marketplace
  registrationNumber: '', // e.g. your PACRA registration number. Leave '' to hide it
  address: '', // your registered office address. Leave '' to hide it
  feePercent: 2.5, // Zemba's fee, taken from the seller's side of each sale
  refundWorkingDays: 5, // working days you promise for refunds to reach the buyer
  payoutWorkingDays: 3, // working days you promise for seller payouts after delivery is confirmed
  legalUpdated: '8 October 2026', // change this date whenever you edit the legal pages
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