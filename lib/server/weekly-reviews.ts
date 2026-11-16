import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { weeklyReviewSchema, type WeeklyReview } from '../weekly-review';

export async function getWeeklyReviews(): Promise<WeeklyReview[]> {
  const directory = path.join(process.cwd(), 'content/weekly-reviews');
  const names = await readdir(directory);
  const reviews = await Promise.all(
    names
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .map(async (name) => {
        const review = weeklyReviewSchema.parse(
          JSON.parse(await readFile(path.join(directory, name), 'utf8')),
        );
        if (name !== review.weekEnding + '.json')
          throw new Error('Weekly review filename must match its period');
        await access(path.join(process.cwd(), 'public', review.cover.src));
        return review;
      }),
  );
  return reviews
    .filter((review) => Date.parse(review.publishedAt) <= Date.now())
    .sort((left, right) => right.weekEnding.localeCompare(left.weekEnding));
}
