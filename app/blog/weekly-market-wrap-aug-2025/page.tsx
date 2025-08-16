'use client';

import { Calendar } from 'lucide-react';
import Image from 'next/image';
import Script from 'next/script';
import { useRef } from 'react';

import BackToTop from '@/components/BackToTop';
import WeeklyMarketWrapAug2025 from '@/components/blog/weekly-market-wrap-aug-2025';
import BlogEnhancements from '@/components/blog-enhancements';
import BlogLayout from '@/components/blog-layout';
import BlogBackButton from '@/components/BlogBackButton';
import RelatedPosts from '@/components/related-posts';
import ShareButtons from '@/components/share-buttons';

export default function BlogPostPage() {
  const articleRef = useRef<HTMLElement>(null);
  const postUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <BlogLayout>
      <div className="blog-container max-w-3xl mx-auto">
        <BlogEnhancements target={articleRef} />

        <article ref={articleRef} className="prose prose-lg dark:prose-invert max-w-none">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <BlogBackButton className="!mr-2" />
              <span className="blog-category category-markets">Markets</span>
              <span className="blog-category category-weekly-wrap">Weekly Wrap</span>
              <span className="blog-category category-trends">Trends</span>
            </div>
            <h1>
              Weekly Market Wrap: Records, Rotations, and a Reality Check – August 11–15, 2025
            </h1>

            <div className="article-metadata">
              <div className="flex items-center">
                <Image
                  src="/placeholder-user.jpg"
                  alt="Author"
                  width={24}
                  height={24}
                  className="author-avatar"
                />
                <span>Exchangetime Team</span>
              </div>
              <span className="separator">•</span>
              <div className="flex items-center">
                <Calendar size={14} className="mr-1" />
                <span>August 15, 2025</span>
              </div>
            </div>

            <ShareButtons
              title="Weekly Market Wrap: Records, Rotations, and a Reality Check – August 11–15, 2025"
              url={postUrl}
            />
          </header>

          <div className="relative w-full h-80 mb-6 rounded-lg overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1439434768192-c60615c1b3c8?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Bull statue stock market symbol August 2025"
              fill
              priority
              className="object-cover"
            />
          </div>

          <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

          <WeeklyMarketWrapAug2025 />

          <ShareButtons
            title="Weekly Market Wrap: Records, Rotations, and a Reality Check – August 11–15, 2025"
            url={postUrl}
          />

          <Script
            id="weekly-market-wrap-aug-2025-ld"
            type="application/ld+json"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline:
                  'Weekly Market Wrap: Records, Rotations, and a Reality Check – August 11–15, 2025',
                datePublished: '2025-08-15',
                author: [{ '@type': 'Organization', name: 'Exchangetime Team' }],
                image: [
                  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1600&q=80',
                ],
                mainEntityOfPage: postUrl || undefined,
                description:
                  'A dramatic week for U.S. stocks: record highs, inflation optimism, PPI reality check, sector rotations, and what lies ahead for investors.',
              }),
            }}
          />
        </article>

        <RelatedPosts
          currentPostSlug="weekly-market-wrap-aug-2025"
          categories={['Markets', 'Weekly Wrap', 'Trends']}
        />
        <BackToTop target={articleRef} threshold={160} />
      </div>
    </BlogLayout>
  );
}
