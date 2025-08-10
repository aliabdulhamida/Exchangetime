'use client';

import { Calendar } from 'lucide-react';
import Image from 'next/image';
import Script from 'next/script';
import { useRef } from 'react';

import BackToTop from '@/components/BackToTop';
import BlogEnhancements from '@/components/blog-enhancements';
import BlogLayout from '@/components/blog-layout';
import BlogBackButton from '@/components/BlogBackButton';
import RelatedPosts from '@/components/related-posts';
import ShareButtons from '@/components/share-buttons';
// styles kommen global über app/globals.css

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
              <span className="blog-category category-analysis">Analysis</span>
            </div>
            <h1>Market Analysis: The Impact of Interest Rate Policy on Global Markets</h1>

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
                <span>August 8, 2025</span>
              </div>
            </div>

            <ShareButtons
              title="Market Analysis: The Impact of Interest Rate Policy on Global Markets"
              url={postUrl}
            />
          </header>

          <div className="relative w-full h-80 mb-6 rounded-lg overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&h=675"
              alt="Central Bank and Market Symbols"
              fill
              priority
              className="object-cover"
            />
          </div>

          <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

          <h2>Introduction</h2>
          <p>
            In recent months, central banks worldwide have made significant adjustments to their
            interest rate policies. These decisions have far-reaching implications for stock, bond,
            and foreign exchange markets. In this article, we examine how various market sectors are
            responding to recent monetary policy decisions and what trends are emerging for the
            coming months.
          </p>

          <h2>Current Interest Rate Policy Overview</h2>
          <p>
            The European Central Bank (ECB) and the Federal Reserve in the US have chosen different
            approaches to respond to economic challenges. While the Fed is announcing a gradual
            easing of its restrictive policy, the ECB is maintaining its cautious course, with only
            minimal adjustments to key interest rates.
          </p>
          <p>
            These diverging strategies create a complex environment for investors, who now more than
            ever need to position their portfolios accordingly.
          </p>

          <h2>Impact on Stock Indices</h2>
          <p>The effects of this policy are clearly visible in global stock indices:</p>
          <ul>
            <li>
              <strong>Technology sector:</strong> Particularly sensitive to interest rate changes,
              as these directly affect valuation models for growth stocks.
            </li>
            <li>
              <strong>Financial sector:</strong> Banks tend to benefit from higher interest rates
              through improved net interest margins.
            </li>
            <li>
              <strong>Real estate sector:</strong> Higher financing costs significantly burden real
              estate companies and REITs.
            </li>
          </ul>

          <h2>Bonds and Fixed Income Securities</h2>
          <p>
            The bond market is particularly sensitive to interest rate changes. Existing bonds lose
            value when interest rates rise, while new issues offer more attractive yields. This
            dynamic creates both challenges and opportunities for investors in fixed income.
          </p>

          <h2>Currency Markets in Flux</h2>
          <p>
            The different monetary policy approaches have led to significant movements in the
            foreign exchange markets. The US dollar has gained strength against the euro, which has
            different consequences for import and export-oriented companies. These currency
            fluctuations increase the complexity of international trade and require robust hedging
            strategies.
          </p>

          <h2>Outlook for Investors</h2>
          <p>
            For investors, this environment means that careful diversification and a deep
            understanding of macroeconomic relationships are more important than ever. The following
            strategies could make sense in the current market situation:
          </p>
          <ol>
            <li>Balanced allocation between growth and value stocks</li>
            <li>
              Targeted investments in sectors that benefit from the current interest rate dynamics
            </li>
            <li>Inclusion of inflation-protected bonds in the portfolio</li>
            <li>Conscious consideration of currency risks in international investments</li>
          </ol>

          <h2>Conclusion</h2>
          <p>
            The current interest rate policies of central banks create a complex but also
            opportunity-rich environment for informed investors. A profound understanding of
            macroeconomic relationships and a forward-looking investment strategy are crucial to
            successfully navigate this environment. Stay informed and adjust your strategy
            accordingly to both minimize risks and take advantage of the opportunities that arise.
          </p>

          {/* Bottom share */}
          <ShareButtons
            title="Market Analysis: The Impact of Interest Rate Policy on Global Markets"
            url={postUrl}
          />

          {/* JSON-LD */}
          <Script
            id="rates-article-ld"
            type="application/ld+json"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: 'Market Analysis: The Impact of Interest Rate Policy on Global Markets',
                datePublished: '2025-08-08',
                author: [{ '@type': 'Organization', name: 'Exchangetime Team' }],
                image: [
                  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&h=675',
                ],
                mainEntityOfPage: postUrl || undefined,
                description: 'Interest rate policy ripple effects across equities, bonds, and FX.',
              }),
            }}
          />
        </article>

        {/* Related Articles */}
        <RelatedPosts currentPostSlug="marktanalyse-zinspolitik" />
        <BackToTop target={articleRef} threshold={160} />
      </div>
    </BlogLayout>
  );
}
