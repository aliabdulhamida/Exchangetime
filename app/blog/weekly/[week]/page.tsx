import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import BlogLayout from '@/components/blog-layout';
import { getWeeklyReviews } from '@/lib/server/weekly-reviews';
import { weeklyChange } from '@/lib/weekly-review';

export async function generateStaticParams() {
  return (await getWeeklyReviews()).map((review) => ({ week: review.weekEnding }));
}

export default async function WeeklyReviewPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const review = (await getWeeklyReviews()).find((item) => item.weekEnding === week);
  if (!review) notFound();
  const citations = (ids: string[]) => (
    <span className="text-sm">
      {' '}
      {ids.map((id) => {
        const index = review.sources.findIndex((source) => source.id === id);
        return (
          <a key={id} className="underline mr-2" href={'#source-' + id}>
            [{index + 1}]
          </a>
        );
      })}
    </span>
  );
  return (
    <BlogLayout>
      <div className="blog-container max-w-3xl mx-auto">
        <article lang="en" className="prose prose-lg dark:prose-invert max-w-none weekly-review">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Link className="blog-back-link terminal-button" href="/blog">
                ← Research library
              </Link>
              <span className="blog-category category-markets">Markets</span>
              <span className="blog-category category-weekly-wrap">Weekly Review</span>
            </div>
            <h1>{review.title}</h1>
            <div className="article-metadata">
              <span>Exchange Time · AI-assisted weekly review</span>
              <span className="separator">•</span>
              <time dateTime={review.publishedAt}>
                {new Date(review.publishedAt).toLocaleDateString('en-GB', {
                  timeZone: 'Europe/Berlin',
                  dateStyle: 'long',
                })}
              </time>
            </div>
            <p className="terminal-note">
              Weekly review · {review.weekStarting} – {review.weekEnding}
            </p>
            <p>
              {review.summary}
              {citations(review.sourceIds)}
            </p>
            <p className="terminal-note">
              Automatically researched and AI-assisted · Published{' '}
              {new Date(review.publishedAt).toLocaleString('en-GB', { timeZone: 'Europe/Berlin' })}{' '}
              (Berlin)
            </p>
          </header>
          <figure className="not-prose mb-8">
            <div className="relative w-full h-60 sm:h-80 rounded-lg overflow-hidden">
              <Image
                src={review.cover.src}
                alt={review.cover.alt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
            <figcaption className="terminal-note mt-3">{review.cover.credit}</figcaption>
          </figure>
          <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Markets at a glance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Index</th>
                    <th>Closing level</th>
                    <th>Week</th>
                    <th>Comparison</th>
                  </tr>
                </thead>
                <tbody>
                  {review.markets.map((market) => (
                    <tr key={market.symbol} className="border-b border-[var(--border)]">
                      <th className="py-3">
                        {market.name}
                        {citations([market.sourceId])}
                      </th>
                      <td>{market.close.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</td>
                      <td>
                        {weeklyChange(market) >= 0 ? '↑ +' : '↓ '}
                        {weeklyChange(market).toFixed(2)}%
                      </td>
                      <td>
                        {market.previousDate} → {market.closeDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="terminal-note">
              Price return: (closing level ÷ previous closing level − 1) × 100. Excludes dividends;
              public holidays may shift the final trading day.
            </p>
          </section>
          {review.sections.map((section) => (
            <section key={section.heading} className="space-y-4">
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} className="leading-relaxed">
                  {paragraph.text}
                  {citations(paragraph.sourceIds)}
                </p>
              ))}
            </section>
          ))}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Sources & data freshness</h2>
            <ol className="space-y-3">
              {review.sources.map((source, index) => (
                <li key={source.id} id={'source-' + source.id}>
                  <a
                    className="underline"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    [{index + 1}] {source.title} ↗
                  </a>
                  <p className="terminal-note">Accessed: {source.accessedAt}</p>
                </li>
              ))}
            </ol>
          </section>
          <p className="terminal-note">
            Market commentary, not investment advice. Past performance is not a forecast. Sources
            may be revised after publication.
          </p>
        </article>
      </div>
    </BlogLayout>
  );
}
