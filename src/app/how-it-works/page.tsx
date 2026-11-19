import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';
import { kwacha } from '@/lib/fees';

export const metadata: Metadata = {
  title: 'How Zemba works',
  description: 'Shop and sell safely in Zambia. Your money is held in escrow until you confirm delivery.',
};

const BUYER_STEPS = [
  ['Find something you like', 'Browse local sellers and add items to your cart.'],
  ['Pay into escrow', 'Pay with mobile money. Your money is held safely - the seller does not get it yet.'],
  ['Receive and confirm', 'When your item arrives, enter your delivery code. Only then is the seller paid.'],
];
const SELLER_STEPS = [
  ['Open your store', 'Register as a seller. We check your details so buyers can trust you.'],
  ['List and ship', 'Add your products with photos. When an order is paid, ship it and upload proof of dispatch.'],
  ['Get paid', 'Once the buyer confirms delivery, your money is sent to your mobile money number.'],
];

function Steps({ items }: { items: string[][] }) {
  return (
    <div className="zemba-steps-row">
      {items.map(([title, text], index) => (
        <div key={title}>
          <span>{index + 1}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <InfoPage eyebrow="Safe shopping" title="How Zemba works" intro="Zemba holds the money until the item has arrived, so buyers and sellers can deal with confidence.">
      <h2 className="zemba-info-h2">If you are buying</h2>
      <Steps items={BUYER_STEPS} />
      <h2 className="zemba-info-h2">If you are selling</h2>
      <Steps items={SELLER_STEPS} />
      <h2 className="zemba-info-h2">What does it cost?</h2>
      <p className="zemba-info-text">Buyers pay a small buyer protection fee of {SITE.buyerFeePercent}% of the item price (minimum {kwacha(SITE.buyerFeeMin)} per order). It is shown at checkout before you pay. Sellers pay a {SITE.feePercent}% commission only when a sale is completed, and it is taken from the payout. Opening a shop is free, and each order must be at least {kwacha(SITE.minOrder)}.</p>
      <h2 className="zemba-info-h2">What if something goes wrong?</h2>
      <p className="zemba-info-text">If a seller does not ship, you are refunded in full automatically. If you change your mind before the seller has dispatched your order, you can cancel it and get the item price back less a small cancellation fee. If the item is not as described, open a dispute from your order page and our team will review it and decide fairly. Your money stays protected the whole time. Read the full <a href="/refund-policy">Refund Policy</a>.</p>
      <p><a href="/browse" className="zemba-retail-cta">Start shopping <span>→</span></a></p>
    </InfoPage>
  );
}
