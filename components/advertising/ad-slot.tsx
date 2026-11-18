'use client';

import React, { useEffect, useRef, useState } from 'react';

import { loadAdSense } from './adsense-loader';
import { advertisingConfig, canRequestAd, type AdPlacement } from '../../lib/advertising-config';

export default function AdSlot({placement, consentGranted = false}: {placement: AdPlacement; consentGranted?: boolean}) {
  const container = useRef<HTMLElement>(null);
  const ad = useRef<HTMLModElement>(null);
  const submitted = useRef(false);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const {enabled, preview, publisherId, slots} = advertisingConfig;
  const slotId = slots[placement];
  const eligible = !preview && canRequestAd(enabled, publisherId, slotId, consentGranted);

  useEffect(() => {
    if (!eligible || !container.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
        setVisible(true);
        observer.disconnect();
      }
    }, {threshold: 0.5, rootMargin: '0px'});
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [eligible]);

  useEffect(() => {
    if (!eligible || !visible || submitted.current || failed) return;
    let active = true;
    void loadAdSense(publisherId).then(() => {
      if (!active || !ad.current?.isConnected || ad.current.getBoundingClientRect().width === 0 || submitted.current) return;
      submitted.current = true;
      try {
        const queue = window.adsbygoogle ?? ([] as Record<string, never>[]);
        window.adsbygoogle = queue;
        queue.push({});
      }
      catch { setFailed(true); }
    }).catch(() => {if (active) setFailed(true);});
    return () => {active = false;};
  }, [eligible, visible, publisherId, failed]);

  if (!enabled && !preview) return null;
  const live = eligible && !failed;
  return <section ref={container} className={'ad-slot ad-slot--' + placement} aria-label="Advertisement"
    data-ad-placement={placement} data-ad-mode={preview ? 'preview' : live ? 'ready' : 'inactive'}>
    <span className="ad-slot-label">Advertisement</span>
    <div className="ad-slot-body">
      {live && !preview ? <ins ref={ad} className="adsbygoogle" data-ad-client={publisherId} data-ad-slot={slotId} />
        : preview ? <div className="ad-slot-preview" data-ad-slot={slotId}>Ad preview · No ad request</div> : null}
    </div>
  </section>;
}
