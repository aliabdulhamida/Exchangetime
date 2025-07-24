"use client"

import { Newspaper, TrendingUp, TrendingDown } from "lucide-react"

interface MarketNews {
  title: string
  summary: string
  impact: "positive" | "negative" | "neutral"
  time: string
}

export default function MarketSummary() {
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
    sp500: { value: "6,358.91", change: "+0.78%", positive: true },
    nasdaq: { value: "21,020.02", change: "+0.61%", positive: true },
    dow: { value: "39,210.12", change: "+0.55%", positive: true },
    vix: { value: "16.32", change: "-1.8%", positive: false },
  }

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Newspaper className="w-5 h-5" />
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
        <h3 className="font-semibold text-gray-900 dark:text-white">Weekly Summary</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1F1F23] p-4 rounded-lg">
          This week, US stock markets reached new all-time highs, driven by strong quarterly results in the technology sector and the prospect of possible interest rate cuts by the Federal Reserve. Volatility remained low as markets looked optimistically toward easing trade relations and stable commodity prices. Alphabet and Nvidia were particularly in focus, impressing with their results and investments in artificial intelligence.
        </p>
      </div>
    </div>
  )
}
