import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';
import { buyerProtectionFee, cancellationFee, cancellationRefund, kwacha, totalToPay } from '@/lib/fees';

export const metadata: Metadata = { title: 'Refund Policy', description: `When and how you get your money back on ${SITE.name}.` };

const EXAMPLE = 200; // an example item price, to show the numbers

export default function RefundPolicyPage() {
  return (
    <InfoPage eyebrow="Legal" title="Refund Policy" intro="Your money is held safely in escrow. Here is exactly when it comes back to you, how much you get back, and how disputes work.">
      <div className="zemba-legal">
        <p className="zemba-legal-meta">Last updated {SITE.legalUpdated}</p>
        <div className="zemba-legal-note">
          <strong>In short</strong>
          If the seller lets you down, you get everything back, including the buyer protection fee. If you change your mind before the seller has dispatched your order, you can cancel and get the item price back less a small cancellation fee. Once you enter the delivery code, the money goes to the seller.
        </div>

        <h2>1. Refunds by situation</h2>
        <table className="zemba-table">
          <thead><tr><th>Situation</th><th>What you get back</th></tr></thead>
          <tbody>
            <tr><td>The seller does not dispatch your order within {SITE.dispatchDays} days of your payment</td><td>Everything you paid, including the buyer protection fee. This happens automatically.</td></tr>
            <tr><td>The delivery window runs out and there is no proof of dispatch</td><td>Everything you paid, including the buyer protection fee. This happens automatically.</td></tr>
            <tr><td>The item is not as described, damaged, fake, or does not arrive, and a dispute is decided in your favour</td><td>Everything you paid, including the buyer protection fee.</td></tr>
            <tr><td>You cancel before the seller has dispatched your order</td><td>The item price less a cancellation fee of {SITE.cancelFeePercent}% (minimum {kwacha(SITE.cancelFeeMin)}). The buyer protection fee is not refunded.</td></tr>
            <tr><td>You have already entered your delivery code</td><td>No refund. The money has been released to the seller.</td></tr>
          </tbody>
        </table>

        <h2>2. How much you get back</h2>
        <p>When a refund is due because the seller did not deliver, you get back the full amount you paid for the order: the item price and the buyer protection fee.</p>
        <p>When you cancel a paid order before dispatch, you get back the item price less the cancellation fee. For example, if you buy a {kwacha(EXAMPLE)} item you pay {kwacha(totalToPay(EXAMPLE))} ({kwacha(EXAMPLE)} plus a {kwacha(buyerProtectionFee(EXAMPLE))} buyer protection fee). If you cancel before dispatch, you get back {kwacha(cancellationRefund(EXAMPLE))}: the {kwacha(EXAMPLE)} item price less a {kwacha(cancellationFee(EXAMPLE))} cancellation fee. The cancellation fee helps cover the payment processing costs of an order that does not go ahead.</p>
        <p>If your mobile money provider charges you for sending the original payment, that charge belongs to the provider and is not refunded by Zemba.</p>

        <h2>3. How to cancel an order</h2>
        <ol>
          <li>Log in and open <a href="/orders">My orders</a>, then open the order.</li>
          <li>While the order is paid and the seller has not yet dispatched it, choose <strong>Cancel this order</strong>.</li>
          <li>The page shows exactly how much you will get back. Confirm to cancel.</li>
        </ol>
        <p>Once the seller has dispatched the order it can no longer be cancelled. If the item does not arrive or is not as described, open a dispute instead (section 6).</p>

        <h2>4. How and when you are refunded</h2>
        <p>Refunds are sent back to the mobile money account you paid from. After a refund is approved we send it as soon as we can. You will see the order marked as refunded and we will notify you by email.</p>

        <h2>5. Delivery windows and extra protection</h2>
        <p>When the seller marks your order as dispatched, they set a delivery window. We warn you 2 days before it ends. If your item is still on its way, you can extend your protection by 7 days from the order page, up to a maximum of 90 days in total. If the window ends and the seller has uploaded proof of dispatch, an administrator reviews the order before any money moves. We may ask both of you for more information.</p>

        <h2>6. How to open a dispute</h2>
        <ol>
          <li>Log in and open <a href="/orders">My orders</a>, then open the order.</li>
          <li>Choose <strong>Open a dispute</strong> and explain what went wrong, for example: wrong colour, item damaged, item missing parts, or item not received.</li>
          <li>You and the seller talk on the order page. Either of you can propose a solution: a full refund, paying the seller, or the buyer sending the item back and then being refunded. The other person accepts or declines.</li>
          <li>If you agree to send the item back, the buyer enters the bus or courier and waybill number, and the seller confirms when it arrives. The buyer is then refunded automatically.</li>
          <li>If you cannot agree, either of you can ask the Zemba team to step in (after 2 days, or sooner if a proposal was declined). We also step in if there is no agreement after 7 days. The team looks at the messages and decides whether to refund the buyer or pay the seller, and tells you why.</li>
        </ol>
        <p>You can open a dispute while the order is paid, dispatched, or waiting for review, and before you confirm delivery. You cannot dispute an order after you have entered the delivery code.</p>

        <h2>7. When the seller is paid</h2>
        <p>The seller is paid when you confirm delivery with your code, or when a dispute is decided in the seller&apos;s favour. Sellers receive the item price less the Zemba commission of {SITE.feePercent}%, sent to their registered mobile money number. We send payouts as soon as we can after that, and you can follow each one on your Payouts page.</p>

        <h2>8. What is not covered</h2>
        <ul>
          <li>Orders where you have already confirmed delivery with your code.</li>
          <li>Changing your mind about an item after the seller has dispatched it, when it arrived as described. Zemba protects you from items that do not arrive or are not as described. It is not a general returns service, although a seller may offer their own return terms in their listing.</li>
          <li>Payments made outside Zemba.</li>
        </ul>

        <h2>9. Seller responsibility</h2>
        <p>When a refund is due because of the seller, the seller pays a refund charge of {SITE.sellerChargePercent}% of the item price (minimum {kwacha(SITE.sellerChargeMin)}), deducted from their next payouts. You as the buyer never pay this charge.</p>

        <h2>10. Honest claims only</h2>
        <p>Disputes must be truthful. If we find that a buyer or seller has made a false claim, forged proof, or tried to cheat the system, we may reject the claim and suspend the account, as set out in our <a href="/terms">Terms of Use</a>.</p>

        <h2>11. Contact us</h2>
        <p>Need help with an order or a refund? Use our <a href="/contact">contact page</a>{SITE.email ? <> or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a></> : null}. Please include your order number.</p>
      </div>
    </InfoPage>
  );
}
