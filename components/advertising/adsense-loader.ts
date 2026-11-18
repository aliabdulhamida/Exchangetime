'use client';

declare global {
  interface Window {
    adsbygoogle?: {push: (request: Record<string, never>) => unknown};
  }
}

let pending: Promise<void> | null = null;

export function loadAdSense(publisherId: string) {
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('exchange-time-adsense');
    if (existing?.dataset.loaded === 'true') { resolve(); return; }
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => {script.dataset.loaded = 'true'; resolve();}, {once: true});
    script.addEventListener('error', () => {script.remove(); reject(new Error('Advertising unavailable'));}, {once: true});
    if (!existing) {
      const loader = script as HTMLScriptElement;
      loader.id = 'exchange-time-adsense';
      loader.async = true;
      loader.crossOrigin = 'anonymous';
      loader.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(publisherId);
      document.head.append(loader);
    }
  }).catch(error => {pending = null; throw error;});
  return pending;
}
