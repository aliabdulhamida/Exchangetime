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

export default function IranEscalationStockMarketImplicationsPage() {
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
              <span className="blog-category category-geopolitics">Geopolitics</span>
              <span className="blog-category category-analysis">Analysis</span>
            </div>

            <h1>
              Iran Escalation Explained: What Happened and What It Means for Global Stock Markets
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
                <span>March 2, 2026</span>
              </div>
            </div>

            <ShareButtons
              title="Iran Escalation Explained: What Happened and What It Means for Global Stock Markets"
              url={postUrl}
            />
          </header>

          <div className="relative w-full h-80 mb-6 rounded-lg overflow-hidden">
            <Image
              src="https://images.pexels.com/photos/3974150/pexels-photo-3974150.jpeg?auto=compress&cs=tinysrgb&w=2000"
              alt="Strait of Hormuz seascape representing Middle East energy route risk"
              fill
              priority
              className="object-cover"
            />
          </div>

          <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

          <section>
            <p>
              The sharp escalation involving Iran, Israel, and the United States in June 2025 was
              one of the clearest reminders that geopolitical shocks still move markets through the
              same old channels: oil, inflation expectations, and risk appetite. Even when the
              military situation stayed fluid, investors began repricing assets within minutes of
              each headline.
            </p>
            <p>
              This article breaks down what escalated, why markets reacted the way they did, and
              what investors should monitor now in 2026 if tensions flare again.
            </p>
          </section>

          <section>
            <h2>What Actually Escalated: A Clear Timeline</h2>
            <p>
              The most acute phase unfolded over less than two weeks in June 2025, but it linked
              military action, energy-risk repricing, and broad cross-asset volatility.
            </p>
            <ul className="list-disc ml-6">
              <li>
                <strong>June 13, 2025:</strong> Israel launched strikes inside Iran, targeting
                military and nuclear-related sites and killing senior commanders and scientists.
              </li>
              <li>
                <strong>June 13-22, 2025:</strong> Iran responded with waves of missile and drone
                attacks toward Israel, keeping regional assets on high alert.
              </li>
              <li>
                <strong>June 21, 2025:</strong> The U.S. struck three Iranian nuclear facilities:
                Fordo, Natanz, and Isfahan.
              </li>
              <li>
                <strong>June 23, 2025:</strong> Iran launched missiles at Al Udeid Air Base in
                Qatar after giving advance notice, and Qatari/U.S. defenses intercepted the strike.
              </li>
              <li>
                <strong>June 24, 2025:</strong> A ceasefire framework was announced, but with
                mutual accusations of violations and no full strategic resolution.
              </li>
            </ul>
          </section>

          <section>
            <h2>Immediate Market Reaction: Oil First, Then Equities</h2>
            <p>
              The first move was textbook: crude spiked, safe havens rallied, and equities sold off
              at the open before partially recovering once traders judged the retaliation as
              calibrated rather than maximal.
            </p>
            <ul className="list-disc ml-6">
              <li>
                <strong>Oil shock:</strong> On June 23, 2025, U.S. benchmark crude rose 6.3% to
                $71.23 after briefly jumping as much as 8.6%. Brent rose 6.7% to $77.74 after an
                intraday move near 9%.
              </li>
              <li>
                <strong>U.S. equities:</strong> The S&amp;P 500 opened down about 1.2% but later
                closed up 0.3%. The Dow finished up 0.1% and the Nasdaq up 0.4%.
              </li>
              <li>
                <strong>Europe and Asia:</strong> Moves were weaker abroad on the same session:
                Germany&apos;s DAX fell 2.6%, France&apos;s CAC 40 fell 2.2%, and Hong Kong&apos;s Hang
                Seng dropped 2.1%.
              </li>
              <li>
                <strong>Rates and havens:</strong> The U.S. 10-year Treasury yield moved up to
                around 4.04% from 3.97% late the prior week, while gold gained roughly 1.2%.
              </li>
              <li>
                <strong>Gas sensitivity:</strong> European natural-gas futures surged, at one point
                rising over 40% from their June 12 lows.
              </li>
            </ul>
            <p>
              The key takeaway: the market priced a higher risk premium, but not a full supply
              catastrophe. That distinction explains why equities stabilized quickly after the first
              shock.
            </p>
          </section>

          <section>
            <h2>Why Iran Escalation Matters for Stocks: The 5 Transmission Channels</h2>
            <ol className="list-decimal ml-6">
              <li>
                <strong>Energy input costs:</strong> Higher oil and gas prices squeeze transport,
                chemicals, airlines, and consumer margins, while supporting upstream energy cash
                flow.
              </li>
              <li>
                <strong>Inflation expectations:</strong> Energy spikes feed headline CPI and can
                delay rate cuts, which hurts long-duration growth multiples.
              </li>
              <li>
                <strong>Shipping and insurance risk:</strong> Any risk around Gulf routes raises
                freight, insurance, and inventory costs even before physical disruption occurs.
              </li>
              <li>
                <strong>Risk-premium repricing:</strong> Investors reduce exposure to cyclical
                equities and add hedges, cash, or gold when event risk jumps.
              </li>
              <li>
                <strong>Policy uncertainty:</strong> Sanctions, export controls, and retaliatory
                measures can alter earnings visibility for energy, industrial, and multinational
                names.
              </li>
            </ol>
          </section>

          <section>
            <h2>Sector-Level Implications</h2>
            <p>
              Not all sectors absorb geopolitical stress equally. During Iran-related escalation,
              relative performance often matters more than index direction.
            </p>
            <ul className="list-disc ml-6">
              <li>
                <strong>Potential beneficiaries:</strong> Integrated oil and gas producers,
                defense contractors, and selected commodity exporters.
              </li>
              <li>
                <strong>Most exposed:</strong> Airlines, logistics, discretionary retail, and
                energy-intensive manufacturers.
              </li>
              <li>
                <strong>Mixed impact:</strong> Banks (higher rates can help NIM, but risk-off
                sentiment hurts credit appetite) and tech (duration-sensitive but less directly tied
                to fuel costs).
              </li>
            </ul>
          </section>

          <section>
            <h2>Regional Equity Impact: U.S. vs Europe vs Emerging Markets</h2>
            <p>
              The June 2025 episode also showed regional differences in vulnerability:
            </p>
            <ul className="list-disc ml-6">
              <li>
                <strong>United States:</strong> Large, diversified market with domestic energy
                depth; initial drawdowns were sharp but short-lived.
              </li>
              <li>
                <strong>Europe:</strong> Greater sensitivity to imported energy and gas-price
                volatility translated into larger equity downside during the shock window.
              </li>
              <li>
                <strong>Emerging markets:</strong> Importers faced pressure via currency and current
                account risk, while commodity exporters were comparatively resilient.
              </li>
            </ul>
          </section>

          <section>
            <h2>Three Forward Scenarios for 2026</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                      Scenario
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                      Market Signal
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                      Likely Equity Effect
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Managed de-escalation
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Oil volatility fades, risk premium compresses
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Broad rally led by cyclicals and rate-sensitive growth
                    </td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Intermittent flare-ups
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Choppy crude, recurring headline shocks
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Range-bound indices, strong dispersion by sector
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Severe supply disruption
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Oil spike, tighter financial conditions, higher inflation risk
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                      Deep risk-off move, defensives and energy outperform
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The probability-weighted base case remains a managed but unstable equilibrium, not an
              immediate return to pre-crisis risk pricing.
            </p>
          </section>

          <section>
            <h2>What Investors Should Watch Next</h2>
            <ul className="list-disc ml-6">
              <li>
                <strong>Brent and WTI term structure:</strong> Persistent backwardation usually
                signals tighter near-term supply risk.
              </li>
              <li>
                <strong>European gas benchmarks:</strong> Faster indicator of regional stress than
                broad equity indices.
              </li>
              <li>
                <strong>Shipping insurance and freight metrics:</strong> Early warning for
                second-round cost pressure.
              </li>
              <li>
                <strong>U.S. breakeven inflation and Treasury yields:</strong> Shows whether energy
                shock is feeding into macro policy expectations.
              </li>
              <li>
                <strong>Volatility and credit spreads:</strong> If both widen together, equity
                downside risk usually extends beyond a headline-driven dip.
              </li>
            </ul>
          </section>

          <section>
            <h2>Bottom Line</h2>
            <p>
              The Iran escalation was not just a geopolitical story; it was a macro-pricing event.
              Markets treated it as a live test of energy security, inflation risk, and central-bank
              reaction paths. That is why oil moved first, equities repriced quickly, and sector
              divergence widened.
            </p>
            <p>
              For portfolio construction, the lesson is straightforward: in geopolitical regimes,
              index-level calm can hide significant sector and factor risk under the surface.
            </p>
          </section>

          <ShareButtons
            title="Iran Escalation Explained: What Happened and What It Means for Global Stock Markets"
            url={postUrl}
          />

          <Script
            id="iran-escalation-stock-market-implications-ld"
            type="application/ld+json"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline:
                  'Iran Escalation Explained: What Happened and What It Means for Global Stock Markets',
                datePublished: '2026-03-02',
                author: [{ '@type': 'Organization', name: 'Exchangetime Team' }],
                image: [
                  'https://images.pexels.com/photos/3974150/pexels-photo-3974150.jpeg?auto=compress&cs=tinysrgb&w=2000',
                ],
                mainEntityOfPage: postUrl || undefined,
                description:
                  'A comprehensive, date-anchored explainer of the Iran escalation and its implications across global equities, oil, inflation expectations, and sector performance.',
              }),
            }}
          />
        </article>

        <RelatedPosts
          currentPostSlug="iran-escalation-stock-market-implications"
          categories={['Markets', 'Geopolitics', 'Analysis']}
        />
        <BackToTop target={articleRef} threshold={160} />
      </div>
    </BlogLayout>
  );
}
