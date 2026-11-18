import type { MetadataRoute } from 'next';

import { seoAssets, SITE_URL } from '@/lib/seo-assets';
import { getWeeklyReviews } from '@/lib/server/weekly-reviews';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reviews = await getWeeklyReviews();
  return [
    {url: SITE_URL + '/dashboard'},
    {url: SITE_URL + '/blog'},
    ...seoAssets.map(asset => ({url: SITE_URL + '/dashboard/' + asset.slug})),
    ...reviews.map(review => ({url: SITE_URL + '/blog/weekly/' + review.weekEnding, lastModified: review.publishedAt})),
  ];
}
