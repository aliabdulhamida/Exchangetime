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
              <span className="blog-category category-history">History</span>
              <span className="blog-category category-investing">Investing</span>
            </div>
            <h1>Weekend Read: Lessons from the Dot-Com Bubble (1995–2002)</h1>

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
                <span>August 9, 2025</span>
              </div>
            </div>

            <ShareButtons
              title="Weekend Read: Lessons from the Dot-Com Bubble (1995–2002)"
              url={postUrl}
            />
          </header>

          <div className="relative w-full h-80 mb-6 rounded-lg overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&h=675"
              alt="Dot-com era technology and markets"
              fill
              priority
              className="object-cover"
            />
          </div>

          <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

          <h2>Executive Overview</h2>
          <p>
            The dot-com bubble was not a single mania but a multi-year capital allocation experiment
            fueled by a unique convergence: falling interest rates, the commercialisation of the
            internet, deregulation, cheap equity financing, and a powerful narrative about network
            effects and winner-take-most markets. Between 1995 and its peak in March 2000, the
            NASDAQ 100 rose over 1,000%. By late 2002, most pure-play internet stocks had declined
            80–100%, while a handful of platform companies transitioned from speculative stories to
            durable cash generators. Understanding the mechanics, not just the headlines, equips
            investors to evaluate today’s themes: AI infrastructure, genomic platforms, space, and
            clean tech scaling curves.
          </p>

          <h2>Phase 1: Infrastructure & Narrative Formation (1993–1996)</h2>
          <p>
            Early value creation came from foundational layers: backbone providers, browser
            developers, semiconductors, and enterprise hardware. Capital expenditures expanded
            digital capacity. Valuations, while rich relative to historic norms, were still tethered
            to addressable market projections. Analysts extrapolated exponential user growth and
            rising time spent online, framing the internet as a new distribution channel that would
            compress margins for incumbents while enabling asset-light challengers.
          </p>

          <h2>Phase 2: Acceleration & Capital Flood (1997–1999)</h2>
          <p>
            As public market performance validated the theme, venture funding and IPO volume
            exploded. Average first-day IPO pops frequently exceeded 70%. Loss-making firms went
            public with minimal revenues, often emphasising “eyeballs,” page views, or customer
            acquisition velocity rather than unit economics. Marketing spend became an arms race,
            particularly in online retail, portals, and Web 1.0 media. Equity became the currency
            for acquisitions designed to manufacture growth. Margin expansion was deferred in favour
            of land-grab strategies.
          </p>

          <h2>Phase 3: Climax & Fragility (Late 1999 – Q1 2000)</h2>
          <p>
            Valuation dispersion widened: profitable infrastructure suppliers and semiconductor
            leaders traded at high but defensible multiples, while pure concept stocks priced in
            total addressable markets (TAMs) that assumed perfect execution, negligible competition,
            and frictionless scaling. Insider lock-up expiries introduced supply just as retail
            participation peaked. Monetary conditions began tightening, and incremental capital
            required increasingly spectacular narratives to sustain price momentum. Fragility was
            visible in breadth deterioration: a shrinking subset of leaders carried index
            performance.
          </p>

          <h2>Phase 4: Unwinding & Capitulation (2000–2002)</h2>
          <p>
            As rate expectations shifted and earnings failed to converge with prior implied
            trajectories, multiples compressed violently. Business models reliant on perpetual
            external financing became insolvent. Down-rounds eroded employee morale; stock-based
            compensation lost retention power. Vendors tightened payment terms, exposing cash
            conversion inefficiencies. Consolidation followed: assets with real technology or user
            networks were acquired for pennies on the dollar; commoditised front-ends disappeared.
            Survivors refocused on monetisation discipline: profitable ad models, subscription
            pricing, scalable infrastructure utilisation, and supply chain optimisation.
          </p>

          <h2>Behavioral Drivers</h2>
          <ul>
            <li>Extrapolation bias: Linear projection of early exponential adoption curves.</li>
            <li>
              Narrative dominance: Story quality often overwhelmed financial scrutiny in allocating
              capital.
            </li>
            <li>
              Career risk herding: Managers preferred being wrong in consensus than contrarian and
              early.
            </li>
            <li>
              Incentive misalignment: Option-fuelled growth targets incentivised GMV and user
              metrics over sustainable margins.
            </li>
            <li>
              Information latency: Retail flows reacted to media amplification cycles with lag,
              fueling final-stage blow-offs.
            </li>
          </ul>

          <h2>Unit Economics Reality Check</h2>
          <p>
            Many failed ventures suffered negative contribution margins, the more they sold, the
            more cash they burned after factoring fulfilment, returns, and customer service. True
            network effects (increased product utility per incremental user) were frequently
            conflated with mere scale effects (lower average fixed cost). Distinguishing defensible
            structural advantages (proprietary data, switching costs, developer ecosystems) from
            transient first-mover visibility proved decisive.
          </p>

          <h2>Survivor Attributes</h2>
          <ul>
            <li>Platform extensibility enabling adjacent revenue streams.</li>
            <li>Positive or rapidly improving gross margins with path to operating leverage.</li>
            <li>Technical infrastructure leverage (scaling without linear headcount growth).</li>
            <li>Capital discipline once marginal return on marketing spend declined.</li>
            <li>
              Strategic patience: prioritising durability over blitzscaling when unit economics were
              unproven.
            </li>
          </ul>

          <h2>Data Points (Indicative, Simplified)</h2>
          <p>
            At peak, median price-to-sales ratios for unprofitable internet cohorts exceeded 25–30x;
            several iconic names eclipsed 60x. Post-unwind, surviving platforms often traded at
            single-digit sales multiples with improving gross margins, setting up multi-year
            compounding. Semiconductor capex cycles that enabled bandwidth expansion in 1996–1999
            laid groundwork for later cloud and streaming adoption. Thus, some infrastructure
            investments had durable payoff even as speculative layers collapsed.
          </p>

          <h2>Parallels to Current Themes</h2>
          <p>
            Today’s AI infrastructure build-out, energy transition capital cycle, and biotech
            platform ambitions share characteristics with dot-com: heavy upfront investment,
            narrative optionality, and difficulty in near-term profitability forecasting. Key
            analytical filters: (1) Map value chain bottlenecks; (2) Separate compute inflation from
            sustainable pricing power; (3) Stress test margin trajectories under normalising growth;
            (4) Track incremental ROIC versus cost of capital as hype cools.
          </p>

          <h2>Actionable Investor Lessons</h2>
          <ol>
            <li>
              Disaggregate story from unit economics: build explicit customer acquisition cost (CAC)
              to lifetime value (LTV) bridges.
            </li>
            <li>Monitor breadth: narrowing leadership often precedes regime change.</li>
            <li>
              Treat valuation dispersion as information—identify where optimism implies flawless
              execution.
            </li>
            <li>Prefer staged capital deployment in nascent themes to manage model error.</li>
            <li>
              Maintain liquidity buffers; bubbles compress exit windows faster than entry windows.
            </li>
            <li>
              In thematic ETFs, inspect top-10 weight concentration and reconstitution criteria.
            </li>
            <li>
              In venture or small-cap exposure, model dilution paths under flat valuation scenarios.
            </li>
          </ol>

          <h2>Practical Framework for Evaluating Emerging Themes</h2>
          <p>
            Use a 5-layer stack: (1) Core Infrastructure (compute, connectivity); (2) Enabling
            Platforms (APIs, middleware); (3) Application Layer (vertical use cases); (4)
            Aggregators / Marketplaces; (5) Monetisation / Payments. Map where economic rents accrue
            over time, often not at the initial excitement layer. Apply scenario trees with
            probability-weighted TAM realisation rather than single-point estimates.
          </p>

          <h2>Checklist Before Allocating to a Hot Theme</h2>
          <ul>
            <li>Is growth organic versus incentive-driven?</li>
            <li>Does incremental user improve network utility or just headline metrics?</li>
            <li>Are gross margins scaling or plateauing prematurely?</li>
            <li>What is sensitivity to capital market access (runway at lower valuation)?</li>
            <li>Are insiders net accumulators or distributors post lock-up?</li>
            <li>What leading indicators would falsify the bull case?</li>
          </ul>

          <h2>Bottom Line</h2>
          <p>
            The dot-com era was a laboratory: capital misallocation destroyed equity value but
            accelerated infrastructure deployment that later enabled profitable digital ecosystems.
            For modern investors, the lesson is not to avoid innovation, but to separate structural
            advantage from momentum, build probabilistic models, and pace conviction. Bubbles
            compress time, forcing decades of experimentation into a few years. The survivors that
            exit with disciplined cost structures and durable moats can compound for the decade
            after narratives fade.
          </p>

          <ShareButtons
            title="Weekend Read: Lessons from the Dot-Com Bubble (1995–2002)"
            url={postUrl}
          />

          <Script
            id="dot-com-bubble-ld"
            type="application/ld+json"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: 'Weekend Read: Lessons from the Dot-Com Bubble (1995–2002)',
                datePublished: '2025-08-09',
                author: [{ '@type': 'Organization', name: 'Exchangetime Team' }],
                image: [
                  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&h=675',
                ],
                mainEntityOfPage: postUrl || undefined,
                description:
                  'Comprehensive weekend analysis of the dot-com bubble: phases, behaviors, valuations, survivors, parallels to modern themes, and investor frameworks.',
              }),
            }}
          />
        </article>

        <RelatedPosts
          currentPostSlug="dot-com-bubble-weekend-read"
          categories={['Markets', 'History', 'Investing']}
        />
        <BackToTop target={articleRef} threshold={160} />
      </div>
    </BlogLayout>
  );
}
