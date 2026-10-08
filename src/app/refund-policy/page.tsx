import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Refund Policy', description: `When and how you get your money back on ${SITE.name}.` };

export default function RefundPolicyPage() {
  return (
    <InfoPage eyebrow="Legal" title="Refund Policy" intro="Your money is held safely in escrow. Here is exactly when it comes back to you, and how disputes work.">
      <div className="zemba-legal">
        <p className="zemba-legal-meta">Last updated {SITE.legalUpdated}</p>
        <div className="zemba-legal-note">
          <strong>In short</strong>
          If your item does not arrive, or it is not what the seller promised, you can get your money back as long as you have not confirmed delivery with your code. Once you enter the delivery code, the money goes to the seller.
        </div>

        <h2>1. When you get a refund</h2>
        <ul>
          <li><strong>The seller does not send the item.</strong> If the seller has not dispatched your order within 3 days of your payment being confirmed, the order is refunded automatically.</li>
          <li><strong>No proof of dispatch.</strong> If the delivery window runs out and the seller has not uploaded proof that the item was sent, the order is refunded automatically.</li>
          <li><strong>You win a dispute.</strong> If you open a dispute and our administrator decides in your favour, you are refunded.</li>
        </ul>

        <h2>2. How much you get back</h2>
        <p>You get back the full amount you paid for the order. Buyers do not pay a Zemba fee. If your mobile money provider charges you for sending the original payment, that charge belongs to the provider and is not refunded by Zemba.</p>

        <h2>3. How and when you are refunded</h2>
        <p>Refunds are sent back to the mobile money account you paid from. After a refund is approved we aim to complete it within {SITE.refundWorkingDays} working days. You will see the order marked as refunded and we will notify you by email, and by SMS where that is switched on.</p>

        <h2>4. Delivery windows and extra protection</h2>
        <p>When the seller marks your order as dispatched, they set a delivery window. We warn you 2 days before it ends. If your item is still on its way, you can extend your protection by 7 days from the order page, up to a maximum of 90 days in total. If the window ends and the seller has uploaded proof of dispatch, an administrator reviews the order before any money moves. We may ask both of you for more information.</p>

        <h2>5. How to open a dispute</h2>
        <ol>
          <li>Log in and open <a href="/orders">My orders</a>, then open the order.</li>
          <li>Choose <strong>File a dispute</strong> and explain what went wrong, for example: wrong item, item damaged, item missing parts, or item not received.</li>
          <li>You and the seller can send messages on the order page. Keep photos and chat messages that help show what happened.</li>
          <li>A Zemba administrator reviews everything and decides whether to refund you or release the money to the seller. We will tell you the decision and the reason.</li>
        </ol>
        <p>You can open a dispute while the order is paid, dispatched, or waiting for review, and before you confirm delivery. You cannot dispute an order after you have entered the delivery code.</p>

        <h2>6. When the seller is paid</h2>
        <p>The seller is paid when you confirm delivery with your code, or when a dispute is decided in the seller&apos;s favour. Sellers receive the sale price less the Zemba fee of {SITE.feePercent}%, sent to their registered mobile money number. We aim to send payouts within {SITE.payoutWorkingDays} working days.</p>

        <h2>7. What is not covered</h2>
        <ul>
          <li>Orders where you have already confirmed delivery with your code.</li>
          <li>Changing your mind about an item that arrived as described. Zemba protects you from items that do not arrive or are not as described. It is not a general returns service, although a seller may offer their own return terms in their listing.</li>
          <li>Payments made outside Zemba.</li>
        </ul>

        <h2>8. Honest claims only</h2>
        <p>Disputes must be truthful. If we find that a buyer or seller has made a false claim, forged proof, or tried to cheat the system, we may reject the claim and suspend the account, as set out in our <a href="/terms">Terms of Use</a>.</p>

        <h2>9. Contact us</h2>
        <p>Need help with an order or a refund? Use our <a href="/contact">contact page</a>{SITE.email ? <> or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a></> : null}. Please include your order number.</p>
      </div>
    </InfoPage>
  );
}
