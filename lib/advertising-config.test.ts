import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { advertisingConfig, AD_SLOT_PLACEHOLDER, canRequestAd } from './advertising-config';
import AdSlot from '../components/advertising/ad-slot';

const original = {...advertisingConfig, slots: {...advertisingConfig.slots}};
afterEach(() => Object.assign(advertisingConfig, {...original, slots: {...original.slots}}));
describe('advertising safety gates', () => {
  it('requires explicit enablement, real IDs and affirmative consent', () => {
    const publisher = 'ca-pub-8377777238288489';
    expect(canRequestAd(false, publisher, '9876543210', true)).toBe(false);
    expect(canRequestAd(true, publisher, AD_SLOT_PLACEHOLDER, true)).toBe(false);
    expect(canRequestAd(true, publisher, '0000000000', true)).toBe(false);
    expect(canRequestAd(true, publisher, '9876543210', false)).toBe(false);
    expect(canRequestAd(true, 'ca-pub-[DEINE_PUBLISHER_ID]', '9876543210', true)).toBe(false);
    expect(canRequestAd(true, publisher, '9876543210', true)).toBe(true);
  });
  it('renders nothing when disabled, with no empty advertising footprint', () => {
    advertisingConfig.enabled = false;
    advertisingConfig.preview = false;
    expect(renderToStaticMarkup(createElement(AdSlot, {placement: 'overview'}))).toBe('');
  });
  it('renders preview placeholders without executable ad markup or scripts', () => {
    advertisingConfig.preview = true;
    const html = renderToStaticMarkup(createElement(AdSlot, {placement: 'assetContent', consentGranted: true}));
    expect(html).toContain('data-ad-slot="1234567890"');
    expect(html).toContain('No ad request');
    expect(html).not.toContain('class="adsbygoogle"');
    expect(html).not.toContain('<script');
  });
  it('does not render live ad markup for placeholder IDs or pending consent', () => {
    advertisingConfig.enabled = true;
    advertisingConfig.preview = false;
    expect(renderToStaticMarkup(createElement(AdSlot, {placement: 'overview', consentGranted: true}))).not.toContain('<ins');
    advertisingConfig.slots.overview = '9876543210';
    expect(renderToStaticMarkup(createElement(AdSlot, {placement: 'overview'}))).not.toContain('<ins');
  });
});
