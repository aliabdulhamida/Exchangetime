"use client"

import { Activity, TrendingUp, TrendingDown } from "lucide-react"
import { useState, useEffect } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader } from "@/components/ui/dialog"

export default function FearGreedIndex() {
  const [index, setIndex] = useState<number | null>(null)
  const [trend, setTrend] = useState<"up" | "down" | "neutral">("neutral")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastIndex, setLastIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchFearGreedIndex = async () => {
      setLoading(true)
      setError(null)
      try {
        const url = 'https://fear-and-greed-index.p.rapidapi.com/v1/fgi'
        const options = {
          method: 'GET',
          headers: {
            'x-rapidapi-key': 'a8d81eea34msh9318a170ad799bdp1a9d7fjsna333e1b65e8a',
            'x-rapidapi-host': 'fear-and-greed-index.p.rapidapi.com'
          }
        }
        const response = await fetch(url, options)
        if (!response.ok) {
          if (response.status === 429) setError("Too many requests. Please try again later.")
          else setError(`API error: ${response.status}`)
          setLoading(false)
          return
        }
        const data = await response.json()
        const score = data.fgi.now.value
        setLastIndex(index)
        setIndex(score)
        setLoading(false)
      } catch (err) {
        setError("Error fetching data")
        setLoading(false)
      }
    }
    fetchFearGreedIndex()
    const interval = setInterval(fetchFearGreedIndex, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (lastIndex !== null && index !== null) {
      if (index > lastIndex + 2) setTrend("up")
      else if (index < lastIndex - 2) setTrend("down")
      else setTrend("neutral")
    }
  }, [index, lastIndex])


  // Farbverlauf von grün (0) zu rot (100)
  const getGradientColor = (value: number) => {
    // value: 0 (rot) bis 100 (grün)
    const r = Math.round(220 - (220 - 34) * (value / 100)); // 220 -> 34
    const g = Math.round(38 + (197 - 38) * (value / 100)); // 38 -> 197
    const b = Math.round(38 + (94 - 38) * (value / 100)); // 38 -> 94
    return `rgb(${r},${g},${b})`;
  };

  const getIndexLabel = (value: number | null) => {
    if (value === null) return { label: "Loading...", color: "#9ca3af" }
    if (value <= 25) return { label: "Extreme Fear", color: getGradientColor(0) }
    if (value <= 45) return { label: "Fear", color: getGradientColor(25) }
    if (value <= 55) return { label: "Neutral", color: getGradientColor(50) }
    if (value <= 75) return { label: "Greed", color: getGradientColor(75) }
    return { label: "Extreme Greed", color: getGradientColor(100) }
  }

  const indexInfo = getIndexLabel(index)

  // Animierter Kreis für Fear & Greed Wert
  const circleValue = index !== null ? Math.max(0, Math.min(100, index)) : 0;
  const circumference = 2 * Math.PI * 12;
  const offset = circumference - (circleValue / 100) * circumference;

  return (
    <Dialog>
      <div className="flex items-center gap-2 px-2 py-1 rounded">
        <svg width="18" height="18" viewBox="0 0 18 18" className="animate-spin-slow" style={{ animationDuration: '2s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }}>
          <circle
            cx="9"
            cy="9"
            r="7"
            fill="none"
            stroke={getGradientColor(circleValue)}
            strokeWidth="3"
            strokeDasharray={2 * Math.PI * 7}
            strokeDashoffset={2 * Math.PI * 7 - (circleValue / 100) * (2 * Math.PI * 7)}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <span className="font-bold text-xs" style={{ color: indexInfo.color }}>{index !== null ? Math.round(index) : "-"}</span>
        <DialogTrigger asChild>
          <button className="text-[10px] font-medium underline underline-offset-2 bg-transparent p-0 m-0 border-none cursor-pointer hover:text-blue-600 transition" style={{ color: indexInfo.color, background: "none" }}>
            {indexInfo.label}
          </button>
        </DialogTrigger>
        {trend === "up" && <TrendingUp className="w-3 h-3 text-green-500 ml-1" />}
        {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500 ml-1" />}
      </div>
      <DialogContent>
        <DialogHeader>
          <span className="text-lg font-bold">Fear & Greed Index – Explanation</span>
        </DialogHeader>
        <div className="mt-2 text-sm text-gray-700">
          The <span className="font-semibold">Fear & Greed Index</span> measures the emotions of investors in the stock market. A low value means fear, a high value means greed. The index is based on various market indicators and helps to identify extreme phases.<br /><br />
          <b>How is the index calculated?</b><br />
          The index combines several factors such as market volatility, stock price momentum, put and call options, market volume, and safe haven demand. These components are weighted to reflect the overall sentiment.<br /><br />
          <b>Why is it useful?</b><br />
          The Fear & Greed Index can help investors recognize periods of excessive pessimism or optimism, which often precede market reversals. It is not a direct trading signal, but a tool for better understanding market psychology.<br /><br />
          <ul className="mt-2 list-disc pl-4">
            <li><span className="font-bold text-red-600">Extreme Fear (0-25):</span> Investors are very cautious.</li>
            <li><span className="font-bold text-orange-500">Fear (26-45):</span> Predominantly cautious sentiment.</li>
            <li><span className="font-bold text-yellow-500">Neutral (46-55):</span> Balanced market sentiment.</li>
            <li><span className="font-bold text-green-600">Greed (56-75):</span> Investors are becoming more risk-seeking.</li>
            <li><span className="font-bold text-green-700">Extreme Greed (76-100):</span> Very high risk appetite.</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
