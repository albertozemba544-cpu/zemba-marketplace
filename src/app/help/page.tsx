import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';
import { kwacha } from '@/lib/fees';

export const metadata: Metadata = {
  title: 'Help centre',
  description: 'Answers about paying safely with escrow, delivery codes, disputes, refunds and selling on Zemba Marketplace.',
};

const BUYERS = [
  ['How does escrow protect me?', 'When you pay, your money is held safely by Zemba - the seller does not receive it yet. The seller ships your order, and only after you confirm that it arrived is the money released to them.'],
  ['What is the delivery code?', 'After you pay, you get a 6-digit delivery code on your order page. Give the seller the code only when the item is in your hands. Entering it on the order page releases the payment to the seller.'],
  ['How is shipping worked out?', 'The seller sets the shipping price for each town when listing the item, or offers free shipping. Enter your town in the cart and the shipping price is added automatically. You pay the item, the shipping and the buyer protection fee in one payment, so there is nothing more to pay the seller for delivery.'],
  ['What does it cost to buy?', `Buyers pay a buyer protection fee of ${SITE.buyerFeePercent}% of the item price plus shipping, with a minimum of ${kwacha(SITE.buyerFeeMin)} per order. You see the total, including the fee, before you pay. Each order must be at least ${kwacha(SITE.minOrder)}.`],
  ['The seller has not shipped my order. What now?', `Sellers have ${SITE.dispatchDays} days to ship a paid order. If they do not, the order is refunded to you automatically, in full, including the buyer protection fee.`],
  ['Can I cancel an order?', `Yes, until the seller has dispatched it. Open the order and choose "Cancel this order". You get the item price back less a cancellation fee of ${SITE.cancelFeePercent}% (minimum ${kwacha(SITE.cancelFeeMin)}). The buyer protection fee is not refunded. After the seller has dispatched the order it cannot be cancelled, but you can open a dispute if the item does not arrive or is not as described.`],
  ['My order has not arrived yet.', 'Your money stays protected while the item is on its way. If the delivery window is about to end you will get a reminder, and you can extend your protection by 7 days from the order page.'],
  ['Something is wrong with my order. What can I do?', 'Open the order from "My orders" and choose "Open a dispute". Tell us what went wrong, then talk to the seller there and agree a solution, such as a refund or sending the item back. If you cannot agree, ask the Zemba team to step in and they will decide.'],
  ['How do refunds work?', 'If the seller did not deliver, you get back everything you paid. If you cancelled before dispatch, you get back the item price less the cancellation fee, plus the shipping you paid. The refund is sent to your mobile money number and you get a message when it has been sent. See the Refund Policy for details.'],
  ['I forgot my password.', 'On the sign-in page choose "Forgot your password?" and we will email you a link to choose a new one.'],
];

const SELLERS = [
  ['How do I start selling?', 'Create a seller account and add your products. They go live straight away. Anything that looks suspicious is hidden until our team has checked it.'],
  ['How does shipping work for sellers?', 'When you list an item you choose free shipping, or you set a shipping price for each town (and optionally one price for all other towns). The buyer pays the shipping together with the item. You receive it with your payout and Zemba takes no commission on it, so you can pay the bus or courier without being out of pocket.'],
  ['What does it cost to sell?', `Opening a shop and listing items is free. When a sale is completed, Zemba keeps a commission of ${SITE.feePercent}% of the item price. Buyers pay their own protection fee on top of your price. Each order must be at least ${kwacha(SITE.minOrder)}.`],
  ['When do I get paid?', 'After the buyer confirms delivery, your payment (the item price minus the Zemba commission) is sent to the mobile money number on your account. You can follow every payout under "Payouts" in your seller dashboard.'],
  ['What do I need to do after an order is paid?', `Ship the item within ${SITE.dispatchDays} days, then mark it as dispatched and upload a photo of your proof of dispatch (for example the bus or courier receipt). If you do not, the buyer is refunded in full and a refund charge of ${SITE.sellerChargePercent}% of the item price (minimum ${kwacha(SITE.sellerChargeMin)}) is deducted from your next payouts.`],
  ['Can I edit or remove a listing?', 'Yes. Open your dashboard and choose Edit next to a listing. Price, stock and pausing take effect straight away. Changing the title, description or photos sends the listing for a quick re-check.'],
  ['What is a quick link?', 'A quick link is a payment page for one item that you can share on WhatsApp, Facebook or Instagram. The buyer still pays through escrow.'],
];

function Faq({ items }: { items: string[][] }) {
  return (
    <div className="zemba-faq">
      {items.map(([question, answer]) => (
        <details key={question}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}

export default function HelpPage() {
  return (
    <InfoPage eyebrow="Help centre" title="How can we help?" intro="Quick answers to the questions we hear most.">
      <h2 className="zemba-info-h2">For buyers</h2>
      <Faq items={BUYERS} />
      <h2 className="zemba-info-h2">For sellers</h2>
      <Faq items={SELLERS} />
    </InfoPage>
  );
}
