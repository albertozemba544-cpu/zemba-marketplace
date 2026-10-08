'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="zemba-info" style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <p className="zemba-retail-eyebrow">Something went wrong</p>
      <h1>Sorry, that did not work</h1>
      <p className="zemba-info-intro" style={{ margin: '0.8rem auto 2rem' }}>It was not your fault. Please try again. If it keeps happening, tell us on the contact page.</p>
      <button className="zemba-retail-cta" onClick={() => reset()}>Try again <span>↻</span></button>
      <p style={{ marginTop: '1.5rem' }}><a href="/">Go to the home page</a> · <a href="/contact">Contact us</a></p>
    </main>
  );
}
