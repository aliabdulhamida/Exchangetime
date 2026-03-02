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
              Iran Escalation (Feb 28-March 1, 2026): What Happened and What It Means for Stocks
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
                <span>March 3, 2026</span>
              </div>
            </div>

            <ShareButtons
              title="Iran Escalation (Feb 28-March 1, 2026): What Happened and What It Means for Stocks"
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
              The sharp escalation involving Iran, Israel, and the United States on February 28 and
              March 1, 2026, was a clear reminder that geopolitical shocks still move markets
              through the same channels: oil, inflation expectations, and risk appetite. Even with
              the military picture changing hour by hour, investors began repricing assets within
              minutes of each headline.
            </p>
            <p>
              This article breaks down what escalated over that weekend, why markets reacted the
              way they did, and what investors should monitor now if tensions flare again.
            </p>
          </section>

          <section>
            <h2>What Actually Escalated: A Clear Timeline</h2>
            <p>
              The most acute phase unfolded over the Feb 28-Mar 1 weekend and linked military
              action, energy-risk repricing, and broad cross-asset volatility.
            </p>
            <ul className="list-disc ml-6">
              <li>
                <strong>February 28, 2026:</strong> Israel launched major strikes inside Iran on
                military and nuclear-linked infrastructure, marking a new phase in direct regional
                confrontation.
              </li>
              <li>
                <strong>Late February 28 to early March 1:</strong> The United States joined
                follow-on strikes while Iran responded with missile and drone attacks toward Israeli
                and U.S.-aligned targets.
              </li>
              <li>
                <strong>March 1, 2026:</strong> Air-defense activity intensified across the region
                and governments raised domestic alert levels, with travel and security disruptions
                spreading beyond the immediate conflict zone.
              </li>
              <li>
                <strong>March 1, 2026 (market pricing):</strong> Oil and shipping-risk premia rose
                sharply as traders focused on possible disruption around the Strait of Hormuz and
                knock-on inflation risk.
              </li>
            </ul>
          </section>

          <section>
            <h2>Immediate Market Reaction: Oil First, Then Equities</h2>
            <p>
              The first move was textbook: crude spiked, safe havens rallied, and equity futures
              sold off before partially stabilizing once traders assessed whether the conflict would
              remain geographically contained.
            </p>
            <ul className="list-disc ml-6">
              <li>
                <strong>Oil shock:</strong> During weekend and early-session pricing, WTI and Brent
                moved up by high single digits at peak, reflecting risk around Middle East supply
                routes.
              </li>
              <li>
                <strong>U.S. equities:</strong> Futures moved risk-off, led by energy-cost-sensitive
                segments, while defensive and commodity-linked names held up better.
              </li>
              <li>
                <strong>Europe and Asia:</strong> Markets with higher imported-energy exposure
                generally underperformed the U.S. on the initial shock.
              </li>
              <li>
                <strong>Rates and havens:</strong> Gold and the U.S. dollar caught safe-haven bids,
                while rate expectations turned more cautious as traders priced a potential energy
                inflation impulse.
              </li>
              <li>
                <strong>Shipping and gas sensitivity:</strong> Tanker routing, insurance, and LNG
                expectations repriced quickly, amplifying stress in energy-linked assets.
              </li>
            </ul>
            <p>
              The key takeaway: markets priced a higher geopolitical risk premium, but not an
              immediate full supply catastrophe. That distinction explains why downside was sharp but
              not disorderly.
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
              The Feb 28-Mar 1 episode also showed regional differences in vulnerability:
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
            <h2>Three Forward Scenarios for Spring 2026</h2>
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
                      Oil volatility fades and freight premia normalize
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
                      Choppy crude with recurring weekend headline shocks
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
                      Extended oil spike, tighter financial conditions, higher inflation risk
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
                <strong>Hormuz traffic and tanker insurance spreads:</strong> Faster stress signal
                than broad equity indices when shipping risk is the central transmission channel.
              </li>
              <li>
                <strong>European gas benchmarks:</strong> Early warning for second-round cost
                pressure in import-dependent economies.
              </li>
              <li>
                <strong>OPEC+ output messaging:</strong> Helps determine whether policy supply can
                offset conflict-driven risk premia.
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
              The February 28-March 1 Iran escalation was not just a geopolitical story; it was a
              macro-pricing event. Markets treated it as a live test of energy security, inflation
              risk, and central-bank reaction paths. That is why oil moved first, equities repriced
              quickly, and sector divergence widened.
            </p>
            <p>
              For portfolio construction, the lesson is straightforward: in geopolitical regimes,
              index-level calm can hide significant sector and factor risk under the surface.
            </p>
          </section>

          <ShareButtons
            title="Iran Escalation (Feb 28-March 1, 2026): What Happened and What It Means for Stocks"
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
                  'Iran Escalation (Feb 28-March 1, 2026): What Happened and What It Means for Stocks',
                datePublished: '2026-03-03',
                author: [{ '@type': 'Organization', name: 'Exchangetime Team' }],
                image: [
                  'https://images.pexels.com/photos/3974150/pexels-photo-3974150.jpeg?auto=compress&cs=tinysrgb&w=2000',
                ],
                mainEntityOfPage: postUrl || undefined,
                description:
                  'A date-anchored explainer of the Feb 28-March 1, 2026 Iran escalation and its implications across global equities, oil, inflation expectations, and sector leadership.',
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
