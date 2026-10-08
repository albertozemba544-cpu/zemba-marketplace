import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Help centre',
  description: 'Answers about paying safely with escrow, delivery codes, disputes, refunds and selling on Zemba Marketplace.',
};

const BUYERS = [
  ['How does escrow protect me?', 'When you pay, your money is held safely by Zemba - the seller does not receive it yet. The seller ships your order, and only after you confirm that it arrived is the money released to them.'],
  ['What is the delivery code?', 'After you pay, you get a 6-digit delivery code on your order page. Give the seller the code only when the item is in your hands. Entering it on the order page releases the payment to the seller.'],
  ['The seller has not shipped my order. What now?', 'Sellers have 3 days to ship a paid order. If they do not, the order is refunded to you automatically.'],
  ['My order has not arrived yet.', 'Your money stays protected while the item is on its way. If the delivery window is about to end you will get a reminder, and you can extend your protection by 7 days from the order page.'],
  ['Something is wrong with my order. What can I do?', 'Open the order from "My orders" and choose "File a dispute". Tell us what went wrong. The seller can reply, and a Zemba team member reviews it and decides whether to refund you or release the payment.'],
  ['How do refunds work?', 'If a refund is approved, the amount is sent back to your mobile money number and you get a message when it has been sent.'],
  ['I forgot my password.', 'On the sign-in page choose "Forgot your password?" and we will email you a link to choose a new one.'],
];

const SELLERS = [
  ['How do I start selling?', 'Create a seller account. Our team checks your details and approves your account, then you can add products. New listings are also checked before they go live.'],
  ['When do I get paid?', 'After the buyer confirms delivery, your payment (the sale price minus Zemba\'s service fee) is sent to the mobile money number on your account. You can follow every payout under "Payouts" in your seller dashboard.'],
  ['What do I need to do after an order is paid?', 'Ship the item within 3 days, then mark it as dispatched and upload a photo of your proof of dispatch (for example the bus or courier receipt).'],
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
