
import React from "react"
import { Newspaper, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react"

interface MarketNews {
  title: string
  summary: string
  impact: "positive" | "negative" | "neutral"
  time: string
}

export default function MarketSummary() {
  const [expanded, setExpanded] = React.useState(false);
  const weeklyNews: MarketNews[] = [
    {
      title: "US stock markets reach new all-time highs",
      summary:
        "S&P 500 and Nasdaq climb to record levels, driven by strong tech earnings and optimism over a potential US-Japan trade deal.",
      impact: "positive",
      time: "2 hours ago",
    },
    {
      title: "Fed signals possible rate cut in 2025",
      summary:
        "Federal Reserve officials indicate 1–2 rate cuts for this year. Markets rally on the prospect of easier financial conditions.",
      impact: "positive",
      time: "yesterday",
    },
    {
      title: "Oil prices stabilize despite geopolitical uncertainties",
      summary:
        "Oil prices remain volatile but have recently stabilized after new US trade tariffs and ongoing global tensions.",
      impact: "neutral",
      time: "2 days ago",
    },
    {
      title: "Alphabet and Nvidia in focus after quarterly results",
      summary:
        "Strong quarterly results and AI investments push Alphabet and Nvidia shares further up.",
      impact: "positive",
      time: "3 days ago",
    },
  ]

  const marketStats = {
    sp500: { value: "6,388.64", change: "+1.5%", positive: true },
    nasdaq: { value: "23,219.87", change: "+1.0%", positive: true },
    dow: { value: "44,901.92", change: "+1.3%", positive: true },
    vix: { value: "14.93", change: "-2.1%", positive: false },
  }

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">

      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        Weekly Market Summary
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
          <p className="text-xs text-gray-600 dark:text-gray-400">S&P 500</p>
          <p className="font-semibold text-gray-900 dark:text-white">{marketStats.sp500.value}</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600">{marketStats.sp500.change}</span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
          <p className="text-xs text-gray-600 dark:text-gray-400">NASDAQ</p>
          <p className="font-semibold text-gray-900 dark:text-white">{marketStats.nasdaq.value}</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600">{marketStats.nasdaq.change}</span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
          <p className="text-xs text-gray-600 dark:text-gray-400">Dow Jones</p>
          <p className="font-semibold text-gray-900 dark:text-white">{marketStats.dow.value}</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600">{marketStats.dow.change}</span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
          <p className="text-xs text-gray-600 dark:text-gray-400">VIX</p>
          <p className="font-semibold text-gray-900 dark:text-white">{marketStats.vix.value}</p>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-600">{marketStats.vix.change}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <section
          className="rounded-2xl border border-gray-100 dark:border-[#23232a] bg-white dark:bg-[#18181c] p-8 mb-2 max-w-2xl mx-auto flex flex-col gap-6 shadow-sm"
          aria-label="Weekly Market Summary"
        >
          <div className="flex flex-col gap-6 text-[15px]">
            {expanded ? (
              <>
                <div>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">U.S. Markets – All-Time Highs Throughout the Week</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>S&P 500: <span className="font-semibold">+1.5%</span> – new record closing highs each trading day, first “perfect week” since Nov. 2021.</li>
                    <li>Nasdaq Composite: <span className="font-semibold">+1.0%</span> – also ending the week at fresh all-time highs.</li>
                    <li>Dow Jones: <span className="font-semibold">+1.3%</span> – near record territory, up about 208 points (0.5%) on Friday.</li>
                    <li>Rally drivers: strong earnings (e.g. Coca‑Cola, Alphabet, Verizon), corporate optimism, and hopes for trade deals with Japan, the Philippines, and possibly the EU.</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Notable individual stock movers:</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>Deckers soared ~11–12% on robust demand for Hoka and UGG footwear.</li>
                    <li>Intel fell sharply (~8.5%) after missing EPS estimates and announcing job cuts.</li>
                    <li>Tesla rebounded over 4% following news of a robotaxi rollout in San Francisco and increased ARK Invest exposure.</li>
                  </ul>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div>
                  <span className="font-semibold text-green-700 dark:text-green-400">European Markets – Weighed Down by Trade and Sentiment Concerns</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>Stoxx 600: <span className="font-semibold">-0.24%</span>, FTSE 100: <span className="font-semibold">-0.26%</span>, DAX: <span className="font-semibold">-0.41%</span> on Friday (trade-deal skepticism, weak UK retail/confidence data).</li>
                    <li>DAX YTD: <span className="font-semibold">+18.4%</span> heading into the week.</li>
                    <li>July 23: FTSE 100 hit an intraday record high (9,066.31), but pulled back by Friday close.</li>
                  </ul>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div>
                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">Key Drivers & Upcoming Watchpoints</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>Trade optimism: Progress on deals with Japan, the Philippines (and talks with the EU looming), helped fuel sentiment.</li>
                    <li>Earnings momentum: Over 80% of S&P 500 companies beat expectations; analysts expect ~7.7% YoY EPS growth in Q2.</li>
                    <li>Monetary policy focus ahead: Markets anticipate the U.S. Federal Reserve holding rates steady in the coming week, with traders pricing in a ~60% chance of a rate cut by September.</li>
                  </ul>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div>
                  <span className="font-semibold">Market – Weekly Gain – Key Themes</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>S&P 500: +1.5% – daily record closes, strong earnings</li>
                    <li>Nasdaq: +1.0% – tech rally, fresh all-time highs</li>
                    <li>Dow Jones: +1.3% – broader market lift, corporate beats</li>
                    <li>Europe (FTSE/DAX): slight decline – trade uncertainty, mixed economics</li>
                  </ul>
                </div>
                <button className="mt-4 px-4 py-2 rounded bg-white text-black border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center" onClick={() => setExpanded(false)} aria-label="Read less">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">U.S. Markets – All-Time Highs Throughout the Week</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>S&P 500: <span className="font-semibold">+1.5%</span> – new record closing highs each trading day, first “perfect week” since Nov. 2021.</li>
                    <li>Nasdaq Composite: <span className="font-semibold">+1.0%</span> – also ending the week at fresh all-time highs.</li>
                    <li>Dow Jones: <span className="font-semibold">+1.3%</span> – near record territory, up about 208 points (0.5%) on Friday.</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Notable individual stock movers:</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>Deckers soared ~11–12% on robust demand for Hoka and UGG footwear.</li>
                    <li>Intel fell sharply (~8.5%) after missing EPS estimates and announcing job cuts.</li>
                  </ul>
                </div>
                <button className="mt-4 px-4 py-2 rounded bg-white text-black border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center" onClick={() => setExpanded(true)} aria-label="Read more">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
