// A thin bar across the top of every page that tells visitors honestly whether money is real yet.
//
//  - Pretend payments ON  (ALLOW_DEMO_PAYMENTS = "true")   -> "Test mode" bar
//  - Pretend payments OFF (anything else)                 -> "Payments opening soon" bar
//  - Real payments live   (PAYMENTS_LIVE = "true")         -> no bar at all
//
// Change these in Vercel -> Settings -> Environment Variables, then redeploy.

export default function ModeBanner() {
  if (process.env.PAYMENTS_LIVE === 'true') return null;
  const comingSoon = process.env.ALLOW_DEMO_PAYMENTS !== 'true';
  return (
    <div className={`zemba-mode-banner ${comingSoon ? 'soon' : 'test'}`} role="status">
      {comingSoon ? (
        <><strong>Payments are opening soon.</strong> You can browse and meet our sellers now.</>
      ) : (
        <><strong>Test mode:</strong> payments here are pretend and no real money moves. Please do not send any goods or money.</>
      )}
    </div>
  );
}
