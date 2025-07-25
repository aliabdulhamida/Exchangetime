import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Bell, ChevronRight, RotateCw } from "lucide-react"
import { fetchStockData as fetchStockDataPortfolio } from "../stock-market/portfolio-tracker"
import Profile01 from "./profile-01"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ThemeToggle } from "../theme-toggle"
import TradingViewWidget from "../stock-market/tradingviewwidget"
import TradingViewHeatmap from "../stock-market/tradingviewheatmap"

const FearGreedIndex = dynamic(() => import("@/components/stock-market/fear-greed-index"), { ssr: false })

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function TopNav() {
  const [watchlist, setWatchlist] = useState([
    { ticker: "AAPL" },
    { ticker: "MSFT" },
    { ticker: "TSLA" },
  ])
  const [showAdd, setShowAdd] = useState(false)
  const [newTicker, setNewTicker] = useState("")
  const [prices, setPrices] = useState<{ [ticker: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Holt die aktuellen Kurse für alle Aktien in der Watchlist
  const fetchPrices = async () => {
    setLoading(true)
    setError(null)
    const results: { [ticker: string]: string } = {}
    await Promise.all(
      watchlist.map(async (stock) => {
        try {
          const data = await fetchStockDataPortfolio(stock.ticker)
          if (Array.isArray(data) && data.length > 0) {
            const last = data[data.length - 1]
            results[stock.ticker] = last && last.close !== null && last.close !== undefined ? `$${last.close.toFixed(2)}` : "N/A"
          } else {
            results[stock.ticker] = "N/A"
          }
        } catch (err) {
          results[stock.ticker] = "N/A"
          setError('Could not fetch stock prices. Please try again later.')
          if (typeof window !== 'undefined') console.error('Price fetch error', stock.ticker, err)
        }
      })
    )
    setPrices(results)
    setLoading(false)
  }

  useEffect(() => {
    if (watchlist.length === 0) return
    let isMounted = true
    fetchPrices()
    // Optional: alle 60 Sekunden aktualisieren
    const interval = setInterval(() => { if (isMounted) fetchPrices() }, 60000)
    return () => { isMounted = false; clearInterval(interval) }
  }, [watchlist])

  const handleAddStock = () => {
    if (!newTicker.trim()) return
    setWatchlist([
      ...watchlist,
      { ticker: newTicker.trim().toUpperCase() },
    ])
    setNewTicker("")
    setShowAdd(false)
  }

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full">
      <div className="flex items-center justify-center w-full sm:justify-start">
        {/* Watchlist Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#18181b] border border-gray-200 dark:border-[#23232a] mr-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mr-2">Watchlist</span>
              <ChevronRight size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <div className="flex flex-col gap-2 p-2">
              {/* Watchlist-Titel und Reload nebeneinander */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-gray-800 dark:text-gray-100">Watchlist</span>
                <button
                  type="button"
                  onClick={fetchPrices}
                  title="Reload prices"
                  aria-label="Reload prices"
                  disabled={loading}
                  className="h-7 w-7 p-0 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors disabled:opacity-60"
                >
                  <RotateCw className={`w-4 h-4${loading ? ' animate-spin' : ''}`} />
                </button>
              </div>
              {error && (
                <span className="text-xs text-red-500 mb-1">{error}</span>
              )}
              {/* Watchlist-Einträge */}
              {watchlist.map((stock, idx) => (
                <div key={stock.ticker + idx}>
                  <div className="flex items-center px-2 py-1 rounded">
                    <button
                      className="mr-2 text-red-500 hover:text-red-700 text-xs p-1 rounded focus:outline-none"
                      title={`Delete ${stock.ticker}`}
                      aria-label={`Delete ${stock.ticker}`}
                      onClick={() => {
                        setWatchlist(watchlist.filter((_, i) => i !== idx))
                      }}
                    >
                      &#10005;
                    </button>
                    <span className="font-semibold">{stock.ticker}</span>
                    <div className="flex-1" />
                    <span className="text-xs font-mono text-black dark:text-gray-200 min-w-[60px] text-right">
                      {loading
                        ? <span className="text-gray-400">...</span>
                        : prices[stock.ticker] !== undefined
                          ? prices[stock.ticker]
                          : <span className="text-gray-400">...</span>
                      }
                    </span>
                  </div>
                  <div className="border-b border-gray-200 dark:border-[#23232a] mx-2" />
                </div>
              ))}
              {/* Add-Button und Eingabefeld */}
              {showAdd ? (
                <div className="flex flex-col gap-1 mt-2">
                  <input
                    type="text"
                    placeholder="Ticker (e.g. NVDA)"
                    className="px-2 py-1 rounded border text-xs bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#23232a] focus:outline-none uppercase"
                    value={newTicker.toUpperCase()}
                    onChange={e => setNewTicker(e.target.value.toUpperCase())}
                    autoFocus
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      className="px-2 py-1 text-xs rounded bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-white dark:text-black dark:border-gray-300"
                      onClick={handleAddStock}
                    >
                      Add
                    </button>
                    <button
                      className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-[#23232a] text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#18181b]"
                      onClick={() => { setShowAdd(false); setNewTicker("") }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1 mt-2 px-2 py-1 rounded bg-white border border-gray-300 dark:bg-[#18181b] dark:text-gray-200 dark:border-[#23232a] text-xs hover:bg-[#f9f9f9] dark:hover:bg-[#23232a]"
                  style={{ backgroundColor: '#fff', color: '#000' }}
                  onClick={() => setShowAdd(true)}
                >
                  <span style={{ color: '#000' }}>+</span> Add stock
                </button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* TradingViewWidget als Modal wie Watchlist */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#18181b] border border-gray-200 dark:border-[#23232a]">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mr-2">News</span>
              <ChevronRight size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[240px] w-full max-w-md sm:max-w-lg md:max-w-xl">
            <div className="flex flex-col gap-2 p-2">
              <div className="w-full h-[350px] sm:h-[500px] flex items-center justify-center">
                <TradingViewWidget />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Heatmap Modal */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#18181b] border border-gray-200 dark:border-[#23232a] ml-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mr-2">Heatmap</span>
              <ChevronRight size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[240px] w-full max-w-md sm:max-w-lg md:max-w-2xl">
            <div className="flex flex-col gap-2 p-2">
              <div className="w-full h-[350px] sm:h-[700px] flex items-center justify-center">
                <TradingViewHeatmap />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Rechts: Fear & Greed Index und ThemeToggle */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center ml-6">
          <FearGreedIndex />
        </div>
        <ThemeToggle />
      </div>
    </nav>
  )
}
