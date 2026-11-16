import ResearchLibrary from '@/components/research-library';
import { getWeeklyReviews } from '@/lib/server/weekly-reviews';

export default async function BlogPage() {
  const reviews = await getWeeklyReviews();
  return (
    <ResearchLibrary
      weeklyPosts={reviews.map((review) => ({
        id: Number(review.weekEnding.replaceAll('-', '')),
        title: review.title,
        excerpt: review.summary,
        date: review.publishedAt.slice(0, 10),
        readTimeMinutes: Math.max(
          2,
          Math.ceil(JSON.stringify(review.sections).split(/\s+/).length / 200),
        ),
        image: review.cover.src,
        categories: ['Weekly Review', 'Markets'],
        slug: 'weekly/' + review.weekEnding,
      }))}
    />
  );
}
