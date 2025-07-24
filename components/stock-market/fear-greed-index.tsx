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

  const getIndexLabel = (value: number | null) => {
    if (value === null) return { label: "Loading...", color: "text-gray-400" }
    if (value <= 25) return { label: "Extreme Fear", color: "text-red-600 dark:text-red-400" }
    if (value <= 45) return { label: "Fear", color: "text-orange-600 dark:text-orange-400" }
    if (value <= 55) return { label: "Neutral", color: "text-yellow-600 dark:text-yellow-400" }
    if (value <= 75) return { label: "Greed", color: "text-green-600 dark:text-green-400" }
    return { label: "Extreme Greed", color: "text-green-700 dark:text-green-300" }
  }

  const indexInfo = getIndexLabel(index)

  // Kompakte Anzeige für Header
  return (
    <Dialog>
      <div className="flex items-center gap-2 px-2 py-1 rounded">
        <Activity className="w-4 h-4" />
        <span className={`font-bold text-xs ${indexInfo.color}`}>{index !== null ? Math.round(index) : "-"}</span>
        <DialogTrigger asChild>
          <button className={`text-[10px] font-medium ${indexInfo.color} underline underline-offset-2 bg-transparent p-0 m-0 border-none cursor-pointer hover:text-blue-600 transition`} style={{background: "none"}}>
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
