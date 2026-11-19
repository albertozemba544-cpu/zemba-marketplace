'use client';

import { useEffect, useState } from 'react';

// Registers the service worker and offers an "Install Zemba" prompt (Android and desktop Chrome),
// or a short "Add to Home Screen" tip on iPhones. People can dismiss it and it stays away for two weeks.

const DISMISS_KEY = 'zemba_install_dismissed';
const HIDE_DAYS = 14;

export default function PwaSetup() {
  const [deferred, setDeferred] = useState<any>(null);
  const [iosTip, setIosTip] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone || window.location.pathname.startsWith('/admin')) return;
    try {
      const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (last && Date.now() - last < HIDE_DAYS * 24 * 3600 * 1000) return;
    } catch { /* storage unavailable: just show the prompt */ }

    const onPrompt = (event: Event) => { event.preventDefault(); setDeferred(event); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => setDeferred(null));

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    const timer = isIos ? window.setTimeout(() => setIosTip(true), 6000) : undefined;

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setDeferred(null);
    setIosTip(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    dismiss();
  }

  if (!deferred && !iosTip) return null;
  return (
    <div className="zemba-install" role="dialog" aria-label="Install Zemba">
      <img src="/icons/icon-192.png" alt="" />
      <div className="zemba-install-text">
        <strong>Install Zemba on your phone</strong>
        {deferred ? 'Open it like an app, straight from your home screen.' : 'Tap the Share button, then “Add to Home Screen”.'}
      </div>
      {deferred && <button type="button" className="zemba-install-go" onClick={install}>Install</button>}
      <button type="button" className="zemba-install-x" onClick={dismiss} aria-label="Close">×</button>
    </div>
  );
}
