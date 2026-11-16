import { z } from 'zod';

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  });
const citedText = z
  .object({ text: z.string().min(20), sourceIds: z.array(z.string()).min(1) })
  .strict();

export const weeklyReviewSchema = z
  .object({
    version: z.literal(1),
    language: z.literal('en'),
    weekStarting: day,
    weekEnding: day,
    publishedAt: z.string().datetime(),
    title: z.string().min(10),
    cover: z
      .object({
        src: z.string().regex(/^\/images\/weekly\/[a-zA-Z0-9.-]+\.(png|jpg|webp)$/),
        alt: z.string().min(10),
        credit: z.string().min(10),
      })
      .strict(),
    summary: z.string().min(40),
    sourceIds: z.array(z.string()).min(1),
    markets: z
      .array(
        z
          .object({
            name: z.string().min(1),
            symbol: z.string().min(1),
            previousClose: z.number().positive(),
            previousDate: day,
            close: z.number().positive(),
            closeDate: day,
            sourceId: z.string(),
          })
          .strict(),
      )
      .min(3),
    sections: z
      .array(
        z.object({ heading: z.string().min(3), paragraphs: z.array(citedText).min(1) }).strict(),
      )
      .min(3),
    sources: z
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(3),
            url: z
              .string()
              .url()
              .refine((value) => new URL(value).protocol === 'https:'),
            accessedAt: z.string().datetime(),
          })
          .strict(),
      )
      .min(3),
  })
  .strict()
  .superRefine((review, context) => {
    const fail = (message: string) => context.addIssue({ code: z.ZodIssueCode.custom, message });
    const start = Date.parse(review.weekStarting);
    const end = Date.parse(review.weekEnding);
    if (
      new Date(end).getUTCDay() !== 5 ||
      new Date(start).getUTCDay() !== 1 ||
      end - start !== 4 * 86400000
    )
      fail('Period must be Monday through Friday');
    if (Date.parse(review.publishedAt) < end + 86400000)
      fail('Publish only after Friday is complete');
    const ids = new Set(review.sources.map((source) => source.id));
    if (ids.size !== review.sources.length) fail('Source identifiers must be unique');
    const cited = [
      ...review.sourceIds,
      ...review.markets.map((market) => market.sourceId),
      ...review.sections.flatMap((section) =>
        section.paragraphs.flatMap((paragraph) => paragraph.sourceIds),
      ),
    ];
    if (cited.some((id) => !ids.has(id))) fail('Every citation must reference an existing source');
    for (const market of review.markets) {
      if (
        market.previousDate >= review.weekStarting ||
        start - Date.parse(market.previousDate) > 7 * 86400000 ||
        market.closeDate < review.weekStarting ||
        market.closeDate > review.weekEnding
      )
        fail('Market closing dates fall outside the weekly comparison window');
    }
    if (
      review.sources.some(
        (source) => Date.parse(source.accessedAt) > Date.parse(review.publishedAt),
      )
    )
      fail('Sources must be accessed before publication');
  });

export type WeeklyReview = z.infer<typeof weeklyReviewSchema>;
export const weeklyChange = (market: WeeklyReview['markets'][number]) =>
  (market.close / market.previousClose - 1) * 100;
