import { describe, expect, it } from 'vitest';

import { getWeeklyReviews } from './server/weekly-reviews';
import { weeklyChange, weeklyReviewSchema } from './weekly-review';

function fixture() {
  return {
    version: 1,
    language: 'en',
    weekStarting: '2026-11-09',
    weekEnding: '2026-11-13',
    publishedAt: '2026-11-14T08:00:00Z',
    title: 'Test-only weekly review',
    cover: {
      src: '/images/weekly/test.png',
      alt: 'Test-only illustration',
      credit: 'Synthetic test fixture only',
    },
    summary: 'Synthetic fixture used exclusively to validate the publishing contract.',
    sourceIds: ['a'],
    markets: ['A', 'B', 'C'].map((symbol) => ({
      symbol,
      name: symbol,
      previousClose: 100,
      previousDate: '2026-11-06',
      close: 102,
      closeDate: '2026-11-13',
      sourceId: 'a',
    })),
    sections: ['Markets', 'Economy', 'Outlook'].map((heading) => ({
      heading,
      paragraphs: [{ text: 'A test paragraph with a source reference.', sourceIds: ['b'] }],
    })),
    sources: ['a', 'b', 'c'].map((id) => ({
      id,
      title: 'Test source',
      url: 'https://example.com/' + id,
      accessedAt: '2026-11-14T07:00:00Z',
    })),
  };
}

describe('weekly research publication', () => {
  it('requires English as the declared publication language', () => {
    expect(weeklyReviewSchema.safeParse({ ...fixture(), language: 'de' }).success).toBe(false);
    expect(weeklyReviewSchema.safeParse({ ...fixture(), language: undefined }).success).toBe(false);
  });
  it('validates the permanent archive without adding test data to it', async () => {
    await expect(getWeeklyReviews()).resolves.toBeInstanceOf(Array);
  });
  it('accepts a complete, cited week and computes the weekly rather than daily change', () => {
    const review = weeklyReviewSchema.parse(fixture());
    expect(weeklyChange(review.markets[0])).toBeCloseTo(2);
  });
  it('rejects unresolvable citations, early publication and incorrect comparison dates', () => {
    const unknown = fixture();
    unknown.sourceIds = ['missing'];
    expect(weeklyReviewSchema.safeParse(unknown).success).toBe(false);
    const early = fixture();
    early.publishedAt = '2026-11-13T12:00:00Z';
    expect(weeklyReviewSchema.safeParse(early).success).toBe(false);
    const daily = fixture();
    daily.markets[0].previousDate = '2026-11-12';
    expect(weeklyReviewSchema.safeParse(daily).success).toBe(false);
  });
  it('rejects invalid calendar dates, duplicate sources and non-HTTPS links', () => {
    const dates = fixture();
    dates.weekEnding = '2026-02-30';
    expect(weeklyReviewSchema.safeParse(dates).success).toBe(false);
    const sources = fixture();
    sources.sources[1].id = 'a';
    expect(weeklyReviewSchema.safeParse(sources).success).toBe(false);
    const url = fixture();
    url.sources[0].url = 'javascript:alert(1)';
    expect(weeklyReviewSchema.safeParse(url).success).toBe(false);
  });
});
