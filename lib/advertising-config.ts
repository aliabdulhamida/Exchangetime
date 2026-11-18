export const AD_SLOT_PLACEHOLDER = '1234567890';
export type AdPlacement = 'overview' | 'assetContent';

// Keep live ads off until real slot IDs and the Google CMP consent adapter are verified.
export const advertisingConfig = {
  enabled: process.env.NEXT_PUBLIC_ADS_ENABLED === 'true',
  preview: process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ADS_PREVIEW === 'true',
  publisherId: 'ca-pub-8377777238288489',
  slots: {
    overview: process.env.NEXT_PUBLIC_ADS_SLOT_OVERVIEW || AD_SLOT_PLACEHOLDER,
    assetContent: process.env.NEXT_PUBLIC_ADS_SLOT_ASSET_CONTENT || AD_SLOT_PLACEHOLDER,
  },
};

export function canRequestAd(enabled: boolean, publisherId: string, slotId: string, consentGranted: boolean) {
  return enabled && consentGranted && /^ca-pub-\d{16}$/.test(publisherId) &&
    /^\d{10}$/.test(slotId) && slotId !== AD_SLOT_PLACEHOLDER && !/^0+$/.test(slotId);
}
