import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';
import { buyerProtectionFee, cancellationFee, kwacha, sellerFailureCharge } from '@/lib/fees';

export const metadata: Metadata = { title: 'Terms of Use', description: `The rules for buying and selling on ${SITE.name}.` };

export default function TermsPage() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of Use" intro={`The rules for buying and selling on ${SITE.name}. Please read them before you create an account.`}>
      <div className="zemba-legal">
        <p className="zemba-legal-meta">Last updated {SITE.legalUpdated}</p>
        <div className="zemba-legal-note">
          <strong>In short</strong>
          Buyers pay into escrow, sellers ship, and the money is released to the seller only when the buyer confirms delivery with their delivery code. If something goes wrong, we step in. See our <a href="/refund-policy">Refund Policy</a> for the details.
        </div>

        <h2>1. About these terms</h2>
        <p>{SITE.name} (&quot;Zemba&quot;, &quot;we&quot;, &quot;us&quot;) is run by {SITE.legalName}{SITE.registrationNumber ? `, registered with PACRA under registration number ${SITE.registrationNumber}` : ''}{SITE.address ? `, ${SITE.address}` : ''}. By creating an account or using the website you agree to these terms, our <a href="/privacy">Privacy Policy</a> and our <a href="/refund-policy">Refund Policy</a>. If you do not agree, please do not use the website.</p>
        <p>Zemba is a marketplace. Items are sold by independent sellers, not by Zemba. We provide the website and the escrow service that holds the buyer&apos;s payment until delivery is confirmed. We do not own, store, inspect or deliver the items.</p>

        <h2>2. Your account</h2>
        <ul>
          <li>You must be 18 or older to create an account.</li>
          <li>Give true and complete information, and keep it up to date. One person, one account.</li>
          <li>Keep your password private. You are responsible for everything done through your account. Tell us at once if you think someone else has used it.</li>
          <li>We may ask you to confirm your email address.</li>
          <li>Seller accounts can start selling straight after they register. We may suspend or close any account at any time, for example if people report it, if we find a rule has been broken, or if we are not satisfied with the details given.</li>
        </ul>

        <h2>3. How an order works</h2>
        <ol>
          <li>The buyer adds an item to the cart and pays through the website. The buyer pays the item price, the shipping price set by the seller for the buyer&apos;s town, and the buyer protection fee, all in one payment. The money goes into escrow and is not given to the seller yet.</li>
          <li>The seller must send the item within 3 days of the payment being confirmed and upload proof of dispatch, such as a photo of the waybill or receipt.</li>
          <li>The buyer receives the item, checks it, and enters the 6-digit delivery code shown on the order page.</li>
          <li>When the code is entered, the money is released to the seller, less the Zemba commission.</li>
        </ol>
        <p>A buyer can cancel a paid order until the seller has dispatched it, as explained in section 6. If the seller does not send the item, or the item does not arrive, the buyer is protected as explained in section 6 and in the <a href="/refund-policy">Refund Policy</a>.</p>

        <h2>4. Prices, payments and fees</h2>
        <ul>
          <li>Prices are in Zambian kwacha (ZMW). The price on the listing is the price the buyer pays through Zemba. Any delivery arrangement or charge must be clear in the listing or agreed in writing between buyer and seller.</li>
          <li><strong>Seller commission.</strong> Zemba charges the seller a commission of {SITE.feePercent}% of the item price. It is taken out of the amount paid to the seller. No commission is charged on shipping.</li>
          <li><strong>Shipping.</strong> The seller sets the shipping price for each town when listing an item, or offers free shipping. The buyer sees the shipping price for their town before paying and pays it together with the item. The shipping money is held in escrow with the item and is paid to the seller with the payout. The seller is responsible for paying the bus company or courier.</li>
          <li><strong>Buyer protection fee.</strong> The buyer pays a protection fee of {SITE.buyerFeePercent}% of the item price plus shipping, with a minimum of {kwacha(SITE.buyerFeeMin)} per order. It is added at checkout and shown before the buyer pays. It pays for escrow protection, dispute handling and refunds.</li>
          <li><strong>Minimum order.</strong> The item value of each order must be at least {kwacha(SITE.minOrder)}.</li>
          <li><strong>Cancellation fee.</strong> A buyer who cancels a paid order before dispatch pays a cancellation fee, as set out in section 6.</li>
          <li>There is no fee to open an account or to list items.</li>
          <li>We may change the fees. A change does not affect orders that have already been paid, and we will announce it on the website before it starts.</li>
          <li>Payments and payouts go through mobile money (MTN, Airtel or Zamtel) or other payment providers we choose. Their own terms and any charges they apply also apply.</li>
          <li>Sellers are responsible for any tax that applies to their sales.</li>
        </ul>

        <h2>5. The delivery code</h2>
        <p>The delivery code is for the buyer only. Enter it only after you have the item in your hands and are happy with it. Entering the code releases the money to the seller, and after that the order can no longer be disputed on Zemba. Never give the code to a seller, courier or anyone else before you have received the item. Sellers must never ask a buyer for the code before delivery.</p>

        <h2>6. If something goes wrong</h2>
        <ul>
          <li><strong>The seller does not send the item in time.</strong> The buyer is refunded automatically, in full, including the shipping and the buyer protection fee.</li>
          <li><strong>The buyer cancels before dispatch.</strong> A buyer can cancel a paid order from the order page until the seller has dispatched it. The buyer is then refunded the item price less a cancellation fee of {SITE.cancelFeePercent}% of the item price (minimum {kwacha(SITE.cancelFeeMin)}), plus any shipping paid. The buyer protection fee is not refunded. For example, on a K200 item the buyer pays {kwacha(200 + buyerProtectionFee(200))}, and if the buyer cancels they get back {kwacha(200 - cancellationFee(200))}. Once the seller has dispatched the order it can no longer be cancelled.</li>
          <li><strong>The item does not arrive or is not as described.</strong> If the seller dispatched the order but the item does not arrive, or it is not as described, the buyer can open a dispute. A dispute decided in the buyer&apos;s favour is refunded in full, including the shipping and the buyer protection fee.</li>
          <li><strong>Seller responsibility.</strong> When an order is refunded because the seller did not send it, sent the wrong or a fake item, sent an item that is not as described, or lost a dispute, the seller pays a refund charge of {SITE.sellerChargePercent}% of the item price (minimum {kwacha(SITE.sellerChargeMin)}) to cover the cost of the refund. For example, on a K200 item the charge is {kwacha(sellerFailureCharge(200))}. Zemba deducts the charge automatically from the seller&apos;s next payouts. Zemba may also warn, suspend or remove sellers who are refunded often. If a charge was not fair, a seller can ask us to review it through the contact page.</li>
          <li>While an order is paid and not yet confirmed, the buyer can open a dispute from the order page. Buyer and seller then talk to each other there and try to agree a solution: a refund, paying the seller, or the buyer sending the item back and then being refunded.</li>
          <li>When both of you accept a solution, it happens automatically. If you cannot agree, either of you can ask the Zemba team to step in. We may also step in after 7 days without agreement. The team then decides either to refund the buyer or to release the money to the seller, and explains the decision. Inside the Zemba website this decision on how the escrowed money is paid out is final, but it does not limit any rights you have under Zambian law.</li>
          <li>In a serious situation, such as suspected fraud, we may put an order on hold or pause payments for a short while. We will tell the people involved.</li>
          <li>Full details are in our <a href="/refund-policy">Refund Policy</a>.</li>
        </ul>

        <h2>7. Rules for sellers</h2>
        <ul>
          <li>Provide your real name, NRC number, location and the mobile money number that payouts should be sent to. Check that number carefully. We are not responsible for a payout sent to the number you gave us.</li>
          <li>Listings go live straight away. We check them automatically and look at reports from other users. A listing that looks wrong is hidden until our team has checked it, and we may remove any listing and tell you why.</li>
          <li>Listings must be honest: true descriptions, your own real photos, correct prices and stock. The item you send must match the listing.</li>
          <li>Send the item within 3 days of payment, with a real proof of dispatch, and set a realistic delivery window.</li>
          <li>Do not ask buyers to pay outside Zemba, and do not ask for the delivery code.</li>
          <li>When you send an order by bus or courier, record the company, the waybill number, where the buyer collects it, and upload a photo of the waybill or receipt. The photo must be real and show this order.</li>
          <li>Sellers can ask for a <strong>Verified seller</strong> badge by showing their ID to a member of our team on a short video call. The badge means we checked that ID when we looked at it. We do not keep photos or recordings of it. It is not a promise about the seller&apos;s honesty or the quality of their items, and we may remove it at any time, for example after complaints or if we find the details were false.</li>
          <li>Buyers can see your track record: how long you have been on Zemba, orders completed, how quickly you dispatch, and how many orders were disputed. These numbers come from the website&apos;s own records and cannot be edited.</li>
          <li>Answer buyers and cooperate if there is a dispute.</li>
          <li>Payouts are sent to your registered mobile money number after delivery is confirmed or after a dispute is decided in your favour. The payout is the item price less the Zemba commission, plus the shipping the buyer paid. You can follow each payout on your Payouts page.</li>
        </ul>

        <h2>8. What you must not do</h2>
        <ul>
          <li>Sell or buy anything illegal, stolen, counterfeit, dangerous or harmful, including weapons, illegal drugs and anything you have no right to sell.</li>
          <li>Post false, misleading or offensive listings, reviews or messages, or send false reports about other people.</li>
          <li>Try to cheat the escrow system, for example by making false claims, creating fake accounts or fake orders.</li>
          <li>Try to break into the website, interfere with it, or collect other people&apos;s information.</li>
          <li>Use the website to harass or threaten anyone.</li>
        </ul>

        <h2>9. Reviews and content you post</h2>
        <p>Only buyers who have received an item (they entered their delivery code) can review it, and the review is marked as a verified purchase. Reviews and messages must be honest and based on your own experience. Reviews written by sellers, friends or family to boost sales are not allowed. You allow us to show them on the website. We may remove content that breaks these terms.</p>

        <h2>10. Our responsibility</h2>
        <p>We work to keep Zemba safe and running, but we cannot promise it will always be available or free of errors. We are not the seller of the items and do not guarantee their quality, safety or legality, although the escrow and dispute process is there to protect buyers. To the extent the law allows, we are not liable for indirect losses, and our total liability for any single order is limited to the amount paid for that order. Nothing in these terms removes any right you have under Zambian consumer protection law, or limits liability that cannot be limited by law.</p>

        <h2>11. Suspending or closing accounts</h2>
        <p>We may suspend or close an account, remove listings, or hold payouts where we reasonably believe these terms have been broken, where fraud is suspected, or where the law requires it. You may stop using Zemba at any time. Orders already paid still follow the escrow process.</p>

        <h2>12. Changes to these terms</h2>
        <p>We may update these terms. The date at the top shows when they last changed. If you keep using Zemba after a change, you accept the new terms. Orders already paid are not affected by changes made later.</p>

        <h2>13. Governing law</h2>
        <p>These terms are governed by the laws of the Republic of Zambia, and the courts of Zambia can hear any dispute about them.</p>

        <h2>14. Contact us</h2>
        <p>Questions about these terms? Use our <a href="/contact">contact page</a>{SITE.email ? <> or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a></> : null}.</p>
      </div>
    </InfoPage>
  );
}
