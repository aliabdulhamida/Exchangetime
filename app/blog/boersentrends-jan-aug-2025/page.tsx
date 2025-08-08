"use client";

import { useRef } from "react";
import BlogLayout from "@/components/blog-layout";
import Image from "next/image";
import Script from "next/script";
import { Calendar } from "lucide-react";
import RelatedPosts from "@/components/related-posts";
import ShareButtons from "@/components/share-buttons";
import BackToTop from "@/components/BackToTop";
import BlogEnhancements from "@/components/blog-enhancements";
import BlogBackButton from "@/components/BlogBackButton";
import "@/styles/blog.css";
import "@/styles/enhanced-blog.css";

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
              <span className="blog-category category-trends">Trends</span>
            </div>
            <h1>Stock Market Trends 2025: January to August</h1>

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
              title="Stock Market Trends 2025: January to August" 
              url={postUrl} 
            />
          </header>

          <div className="relative w-full h-80 mb-6 rounded-lg overflow-hidden">
            <Image 
              src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&h=675"
              alt="Stock market trends 2025"
              fill
              priority
              className="object-cover"
            />
          </div>

          <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

          <h2>Macro Backdrop: Rates, Growth, and Liquidity</h2>
          <p>
            From January to August 2025, equity markets navigated moderating inflation prints, uneven global growth,
            and evolving central bank guidance. While the Fed signaled data-dependent easing later in the year,
            the ECB maintained a cautious stance. Liquidity conditions improved versus late-2024, supporting risk assets,
            yet dispersion across regions and sectors remained elevated.
          </p>

          <h2>Key Trends YTD (Jan–Aug 2025)</h2>
          <ul>
            <li><strong>AI Leadership, Broader Participation:</strong> Mega-cap tech with AI exposure continued to lead, but market breadth improved as semis, software infrastructure, and select industrial techs outperformed.</li>
            <li><strong>Quality Tilt:</strong> Profitability, balance-sheet strength, and cash-flow visibility were rewarded amid macro uncertainty.</li>
            <li><strong>Small- and Mid-Cap Catch-Up:</strong> Lower-rate expectations and improving earnings revisions drove periodic catch-up rallies beyond large caps.</li>
            <li><strong>0DTE Options & Volatility Dynamics:</strong> Elevated same-day options activity occasionally amplified intraday swings without derailing the broader uptrend.</li>
            <li><strong>ETF Inflows Concentrated:</strong> Passive and thematic AI vehicles saw strong inflows; dividend and low-volatility strategies also gained traction.</li>
          </ul>

          <h2>Sector Rotation</h2>
          <ul>
            <li><strong>Technology:</strong> Semiconductors (edge and data-center), cloud infrastructure, and cybersecurity outperformed on sustained AI capex.</li>
            <li><strong>Communication Services:</strong> Digital platforms benefited from advertising recovery and AI-driven engagement.</li>
            <li><strong>Industrials:</strong> Automation, robotics, and electrification exposures gained, supported by capex cycles and reshoring.</li>
            <li><strong>Financials:</strong> Banks traded range-bound; NIM pressure was offset by fee income resilience and credit quality remaining stable.</li>
            <li><strong>Energy:</strong> Crude traded in a broad range; integrated majors held up, while clean-tech performance was mixed amid policy and rate sensitivity.</li>
            <li><strong>Healthcare:</strong> Mixed results; med-tech improved on procedure normalization, while select biotech lagged on funding costs.</li>
          </ul>

          <h2>Earnings and Guidance</h2>
          <p>
            Aggregate earnings growth surprised modestly to the upside, led by tech and select consumer services.
            Guidance emphasized disciplined opex, AI monetization roadmaps, and cautious hiring. Buybacks re-accelerated
            in cash-rich sectors, contributing to EPS stability.
          </p>

          <h2>Regional Highlights</h2>
          <ul>
            <li><strong>United States:</strong> Earnings resilience and AI leadership sustained outperformance; breadth improved versus 2024.</li>
            <li><strong>Europe:</strong> Cyclical exposures were volatile; quality exporters with USD revenue and pricing power outperformed.</li>
            <li><strong>Asia:</strong> Japan’s reform momentum and improving ROE supported equities; China remained selective with policy-driven rebounds.</li>
          </ul>

          <h2>What to Watch into Q4 2025</h2>
          <ul>
            <li>Timing and magnitude of policy easing from major central banks</li>
            <li>AI capex durability and supply-chain normalization (chips, power, cooling)</li>
            <li>Consumer resilience as excess savings normalize and labor markets cool</li>
            <li>Geopolitical developments impacting energy, trade, and supply chains</li>
          </ul>

          <h2>Takeaways for Investors</h2>
          <ol>
            <li><strong>Maintain a quality bias</strong> with exposure to cash-generative AI beneficiaries.</li>
            <li><strong>Barbell for uncertainty:</strong> Pair secular growers with defensive cash flows.</li>
            <li><strong>Selective cyclicals:</strong> Industrials and infrastructure tied to automation and electrification.</li>
            <li><strong>Risk management:</strong> Use position sizing and hedges to navigate episodic volatility.</li>
          </ol>

          {/* Bottom share */}
          <ShareButtons 
            title="Stock Market Trends 2025: January to August" 
            url={postUrl} 
          />

          {/* JSON-LD */}
          <Script
            id="trends-2025-article-ld"
            type="application/ld+json"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: "Stock Market Trends 2025: January to August",
                datePublished: "2025-08-08",
                author: [{ "@type": "Organization", name: "Exchangetime Team" }],
                image: [
                  "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&h=675"
                ],
                mainEntityOfPage: postUrl || undefined,
                description: "Key equity market trends from January to August 2025: AI leadership, sector rotation, earnings resilience, and what to watch next.",
              })
            }}
          />
        </article>

        {/* Related Articles */}
        <RelatedPosts currentPostSlug="boersentrends-jan-aug-2025" categories={["Markets", "Trends"]} />
        <BackToTop target={articleRef} threshold={160} />
      </div>
    </BlogLayout>
  );
}
