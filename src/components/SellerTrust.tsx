import { formatDispatchTime, MIN_ORDERS_FOR_SCORE, percent, SellerTrust as Trust } from '@/lib/trustFormat';

// The seller's track record, worked out by the website from real orders. Sellers cannot edit it.
export default function SellerTrust({ trust }: { trust: Trust }) {
  const enough = trust.paid_orders >= MIN_ORDERS_FOR_SCORE;
  const since = trust.member_since ? new Date(trust.member_since).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null;
  return (
    <div className="zemba-trust-panel">
      <div className="zemba-trust-head">
        <strong>Seller track record</strong>
        {trust.verified ? <span className="zemba-verified" title="Zemba checked this seller's NRC and a selfie">✓ Verified seller</span> : <span className="zemba-unverified">ID not checked yet</span>}
      </div>
      {since && <p className="zemba-trust-note">On Zemba since {since}</p>}
      <div className="zemba-trust-grid">
        <div><strong>{trust.completed}</strong><span>orders completed</span></div>
        {enough ? (
          <>
            <div><strong>{formatDispatchTime(trust.avg_dispatch_hours)}</strong><span>to dispatch after payment</span></div>
            <div><strong>{percent(trust.disputes, trust.paid_orders)}</strong><span>of orders disputed ({trust.disputes_lost} lost by the seller)</span></div>
            <div><strong>{trust.no_ship_refunds}</strong><span>refunded because never shipped</span></div>
          </>
        ) : null}
      </div>
      {!enough && <p className="zemba-trust-note">New seller: fewer than {MIN_ORDERS_FOR_SCORE} paid orders so far, so speed and dispute numbers are not shown yet. A few orders can give a misleading picture.</p>}
    </div>
  );
}
