
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
      title: "Major earnings beat expectations in busy reporting week",
      summary:
        "Toyota, Eli Lilly, AMD, and Caterpillar deliver strong Q2 results, driving market optimism and sector rotation into industrials and healthcare.",
      impact: "positive",
      time: "2 hours ago",
    },
    {
      title: "Energy sector rallies as oil companies report robust profits",
      summary:
        "BP, Marathon Petroleum, and Devon Energy post strong quarterly results amid elevated crude prices and refined product margins.",
      impact: "positive",
      time: "yesterday",
    },
    {
      title: "Tech giants show mixed results in Q2 earnings",
      summary:
        "AMD beats expectations while concerns grow over Snowflake and CrowdStrike valuations ahead of their Thursday earnings calls.",
      impact: "neutral",
      time: "2 days ago",
    },
    {
      title: "Pharmaceutical sector gains momentum",
      summary:
        "Eli Lilly and Pfizer report strong quarterly performance, with diabetes and obesity drugs driving significant revenue growth.",
      impact: "positive",
      time: "3 days ago",
    },
  ]

  const marketStats = {
    sp500: { value: "5,621.28", change: "+2.3%", positive: true },
    nasdaq: { value: "17,945.65", change: "+3.1%", positive: true },
    dow: { value: "40,842.79", change: "+1.8%", positive: true },
    vix: { value: "16.24", change: "+1.2%", positive: false },
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
                  <span className="font-semibold text-blue-700 dark:text-blue-400">U.S. Markets – Earnings-Driven Rally This Week</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>S&P 500: <span className="font-semibold">+2.3%</span> – strong weekly performance driven by robust Q2 earnings across multiple sectors.</li>
                    <li>Nasdaq Composite: <span className="font-semibold">+3.1%</span> – tech sector rebounds with AMD and other chipmakers leading gains.</li>
                    <li>Dow Jones: <span className="font-semibold">+1.8%</span> – industrial and healthcare stocks boost blue-chip index performance.</li>
                    <li>Rally drivers: Better-than-expected Q2 earnings from Toyota, Eli Lilly, Caterpillar, AMD, and energy sector outperformance.</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Notable individual stock movers:</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>Toyota Motor surged ~8% after beating Q2 expectations with $84.77B revenue despite automotive headwinds.</li>
                    <li>Eli Lilly gained ~6% following strong diabetes and obesity drug sales, reinforcing its pharmaceutical leadership.</li>
                    <li>AMD jumped ~12% on better-than-expected data center and AI chip demand, revenue up to $7.68B.</li>
                    <li>Energy sector led by BP (+9%) and Marathon Petroleum (+7%) on strong refining margins and crude oil profits.</li>
                  </ul>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div>
                  <span className="font-semibold text-green-700 dark:text-green-400">Sectoral Performance – Energy and Healthcare Lead</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>Energy: <span className="font-semibold">+8.4%</span> – best performing sector with BP, Marathon Petroleum, and Devon Energy delivering strong results.</li>
                    <li>Healthcare: <span className="font-semibold">+4.2%</span> – pharmaceutical giants Eli Lilly and Pfizer drive sector gains with robust drug portfolios.</li>
                    <li>Technology: <span className="font-semibold">+3.8%</span> – AMD's exceptional performance offsets concerns about cloud software valuations.</li>
                    <li>Industrials: <span className="font-semibold">+2.9%</span> – Caterpillar and heavy machinery companies benefit from infrastructure spending.</li>
                  </ul>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div>
                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">Key Earnings Highlights & Market Drivers</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>Q2 earnings season: Over 75% of reporting companies beat EPS estimates, with average beats of ~8% above consensus.</li>
                    <li>Revenue growth acceleration: Healthcare (+12% YoY), Energy (+15% YoY), and Industrials (+6% YoY) showing strong fundamentals.</li>
                    <li>Thursday focus: Cloud software earnings from Snowflake, Datadog, and CrowdStrike could determine tech sector direction.</li>
                    <li>Fed policy stable: Markets expect rates to remain unchanged with potential September cut still on the table.</li>
                  </ul>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div>
                  <span className="font-semibold">Weekly Market Performance – Sector Rotation in Focus</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>S&P 500: +2.3% – broad-based gains across multiple sectors</li>
                    <li>Nasdaq: +3.1% – tech rebound led by semiconductor strength</li>
                    <li>Dow Jones: +1.8% – industrial and healthcare components outperform</li>
                    <li>Russell 2000: +1.4% – small caps benefit from domestic earnings optimism</li>
                    <li>VIX: 16.24 (+1.2%) – slight uptick reflects anticipation ahead of key Thursday earnings</li>
                  </ul>
                </div>
                <button className="mt-4 px-4 py-2 rounded bg-white text-black border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center" onClick={() => setExpanded(false)} aria-label="Read less">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">U.S. Markets – Earnings-Driven Rally This Week</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>S&P 500: <span className="font-semibold">+2.3%</span> – strong weekly performance driven by robust Q2 earnings across multiple sectors.</li>
                    <li>Nasdaq Composite: <span className="font-semibold">+3.1%</span> – tech sector rebounds with AMD and other chipmakers leading gains.</li>
                    <li>Dow Jones: <span className="font-semibold">+1.8%</span> – industrial and healthcare stocks boost blue-chip index performance.</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Notable individual stock movers:</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>Toyota Motor surged ~8% after beating Q2 expectations with $84.77B revenue despite automotive headwinds.</li>
                    <li>AMD jumped ~12% on better-than-expected data center and AI chip demand, revenue up to $7.68B.</li>
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
