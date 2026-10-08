import InfoPage from '@/components/InfoPage';

export default function NotFound() {
  return (
    <InfoPage eyebrow="Error 404" title="We could not find that page" intro="The link may be old or mistyped. Here are some good places to go instead.">
      <p className="zemba-info-text">
        <a className="zemba-retail-cta" href="/" style={{ color: '#fff', textDecoration: 'none' }}>Go to the home page <span>→</span></a>
      </p>
      <p className="zemba-info-text"><a href="/browse">Browse products</a> · <a href="/help">Help centre</a> · <a href="/contact">Contact us</a></p>
    </InfoPage>
  );
}
