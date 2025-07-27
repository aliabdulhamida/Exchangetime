import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Bell, ChevronRight, RotateCw, Trash2, Pencil } from "lucide-react"
import { fetchStockData as fetchStockDataPortfolio } from "../stock-market/portfolio-tracker"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ThemeToggle } from "../theme-toggle"
import TradingViewWidget from "../stock-market/TradingViewWidget"

const FearGreedIndex = dynamic(() => import("@/components/stock-market/fear-greed-index"), { ssr: false })


export default function TopNav() {
  // --- Radio Hover State ---
  const [radioOpen, setRadioOpen] = useState(false)
  const radioTimeout = useRef<NodeJS.Timeout | null>(null)
  const radioRef = useRef<HTMLDivElement | null>(null)
  // Schließe das Radio-Menü bei Klick außerhalb
  useEffect(() => {
    if (!radioOpen) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      if (!radioRef.current) return;
      if (!radioRef.current.contains(e.target as Node)) {
        setRadioOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [radioOpen]);

  const handleRadioEnter = () => {
    if (radioTimeout.current) {
      clearTimeout(radioTimeout.current)
      radioTimeout.current = null
    }
    // Nur öffnen, wenn noch nicht offen
    setRadioOpen(prev => prev ? true : true)
  }

  const handleRadioLeave = () => {
    if (radioTimeout.current) clearTimeout(radioTimeout.current)
    radioTimeout.current = setTimeout(() => {
      setRadioOpen(false)
    }, 2000)
  }
  // Watchlist: Lazy Initializer, liest direkt aus localStorage
  const [watchlist, setWatchlist] = useState<{ ticker: string }[]>(() => {
    if (typeof window === 'undefined') return [
      { ticker: "AAPL" },
      { ticker: "MSFT" },
      { ticker: "TSLA" },
    ];
    try {
      const raw = window.localStorage.getItem('et_watchlist');
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'object' && typeof item.ticker === 'string')) {
          return parsed;
        }
      }
    } catch {}
    return [
      { ticker: "AAPL" },
      { ticker: "MSFT" },
      { ticker: "TSLA" },
    ];
  });
  const [showAdd, setShowAdd] = useState(false)
  const [newTicker, setNewTicker] = useState("")
  const [watchlistTitle, setWatchlistTitle] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('et_watchlist_title');
      if (stored && typeof stored === 'string') return stored;
    }
    return 'Watchlist';
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [prices, setPrices] = useState<{ [ticker: string]: string }>({})
  const [changes, setChanges] = useState<{ [ticker: string]: number | null }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Holt die aktuellen Kurse für alle Aktien in der Watchlist
  const fetchPrices = async () => {
    setLoading(true)
    setError(null)
    const results: { [ticker: string]: string } = {}
    const changesResult: { [ticker: string]: number | null } = {}
    await Promise.all(
      watchlist.map(async (stock) => {
        try {
          const data = await fetchStockDataPortfolio(stock.ticker)
          if (Array.isArray(data) && data.length > 0) {
            const last = data[data.length - 1]
            results[stock.ticker] = last && last.close !== null && last.close !== undefined ? `$${last.close.toFixed(2)}` : "N/A"
            // Tagesveränderung berechnen
            if (data.length > 1 && last && last.close !== null && last.close !== undefined) {
              const prev = data[data.length - 2]
              if (prev && prev.close !== null && prev.close !== undefined && prev.close !== 0) {
                const change = ((last.close - prev.close) / prev.close) * 100
                changesResult[stock.ticker] = change
              } else {
                changesResult[stock.ticker] = null
              }
            } else {
              changesResult[stock.ticker] = null
            }
          } else {
            results[stock.ticker] = "N/A"
            changesResult[stock.ticker] = null
          }
        } catch (err) {
          results[stock.ticker] = "N/A"
          changesResult[stock.ticker] = null
          setError('Could not fetch stock prices. Please try again later.')
          if (typeof window !== 'undefined') console.error('Price fetch error', stock.ticker, err)
        }
      })
    )
    setPrices(results)
    setChanges(changesResult)
    setLoading(false)
  }


  // Lade Watchlist aus localStorage wie im Portfolio Tracker
  // useEffect zum Persistieren der Watchlist

  // Persistiere Watchlist in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('et_watchlist', JSON.stringify(watchlist));
    } catch {}
  }, [watchlist]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('et_watchlist_title', watchlistTitle);
    } catch {}
  }, [watchlistTitle]);

  useEffect(() => {
    if (watchlist.length === 0) return;
    let isMounted = true;
    fetchPrices().catch((err) => {
      if (typeof window !== 'undefined') console.error('fetchPrices error', err);
    });
    // Optional: alle 60 Sekunden aktualisieren
    const interval = setInterval(() => { if (isMounted) fetchPrices().catch((err) => {
      if (typeof window !== 'undefined') console.error('fetchPrices error', err);
    }) }, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [watchlist]);

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
    <>
      <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full pl-0 lg:pl-64">
        <div className="flex flex-nowrap items-center ml-16 gap-x-2 overflow-x-auto">
        {/* Watchlist Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-xs rounded hover:bg-gray-100 dark:hover:bg-[#18181b] border border-gray-200 dark:border-[#23232a] mr-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mr-2">Watchlist</span>
              <ChevronRight size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <div className="flex flex-col gap-2 p-2">
              {/* Watchlist-Titel und Reload nebeneinander */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  {editingTitle ? (
                    <input
                      type="text"
                      className="text-base font-bold text-gray-800 dark:text-gray-100 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none px-1 py-0.5 min-w-[80px]"
                      value={watchlistTitle}
                      onChange={e => setWatchlistTitle(e.target.value)}
                      onBlur={() => setEditingTitle(false)}
                      onKeyDown={e => { if (e.key === 'Enter') setEditingTitle(false); }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span
                        className="text-base font-bold text-gray-800 dark:text-gray-100"
                        title="Watchlist-Titel"
                      >
                        {watchlistTitle}
                      </span>
                      <button
                        type="button"
                        className="ml-1 text-gray-400 hover:text-blue-600 p-1 rounded focus:outline-none"
                        title="Titel bearbeiten"
                        aria-label="Edit Watchlist Title"
                        onClick={() => setEditingTitle(true)}
                      >
                        <Pencil size={13} />
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { fetchPrices().catch((err) => { if (typeof window !== 'undefined') console.error('fetchPrices error', err); }); }}
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
              {watchlist.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-xs text-gray-400">No stocks in watchlist</div>
              ) : (
                watchlist.map((stock, idx) => (
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
                        <Trash2 size={14} />
                      </button>
                      <span className="font-semibold">{stock.ticker}</span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-black dark:text-gray-200 min-w-[60px] text-right flex flex-col items-end">
                        {loading
                          ? <span className="text-gray-400">...</span>
                          : prices[stock.ticker] !== undefined
                            ? <>
                                {prices[stock.ticker]}
                                {changes[stock.ticker] !== undefined && changes[stock.ticker] !== null && !isNaN(changes[stock.ticker] as number) ? (
                                  <span className={
                                    'ml-1 ' +
                                    (changes[stock.ticker]! > 0 ? 'text-green-600' : changes[stock.ticker]! < 0 ? 'text-red-600' : 'text-gray-400')
                                  }>
                                    {changes[stock.ticker]! > 0 ? '+' : ''}{changes[stock.ticker]!.toFixed(2)}%
                                  </span>
                                ) : null}
                              </>
                            : <span className="text-gray-400">...</span>
                        }
                      </span>
                    </div>
                    <div className="border-b border-gray-200 dark:border-[#23232a] mx-2" />
                  </div>
                ))
              )}
              {/* Add-Button und Eingabefeld */}
              {showAdd ? (
                <div className="flex flex-col gap-1 mt-2">
                  <input
                    type="text"
                    placeholder="Ticker"
                    className="px-2 py-1 rounded border text-xs bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#23232a] focus:outline-none"
                    value={newTicker.toUpperCase()}
                    onChange={e => setNewTicker(e.target.value.toUpperCase())}
                    // style entfernt, damit Placeholder nicht uppercase ist
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
            <button className="flex items-center px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-xs rounded hover:bg-gray-100 dark:hover:bg-[#18181b] border border-gray-200 dark:border-[#23232a]">
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
      </div>
      {/* Rechts: Fear & Greed Index und ThemeToggle */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center ml-6">
          <FearGreedIndex />
        </div>
        <ThemeToggle />
      </div>
      </nav>
      {/* TuneIn Radio Hover Bottom Right */}
      <div
        ref={radioRef}
        style={{ position: 'fixed', bottom: 155, right: 24, zIndex: 1000 }}
        onMouseEnter={handleRadioEnter}
        onMouseLeave={handleRadioLeave}
      >
        <button
          className="rounded-full shadow-xl bg-white dark:bg-[#18181b] border-2 border-gray-300 dark:border-[#23232a] p-3 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-emerald-900 animate-radio-pulse"
          style={{ boxShadow: '0 3px 12px rgba(34,197,94,0.10)' }}
          tabIndex={0}
          aria-label="Radio öffnen"
          onClick={e => {
            // Verhindere Doppelauslösung durch Touch
            if ((window as any)._radioTouchHandled) {
              (window as any)._radioTouchHandled = false;
              return;
            }
            e.stopPropagation();
            if (!radioOpen) {
              handleRadioEnter();
              if (radioTimeout.current) clearTimeout(radioTimeout.current);
              radioTimeout.current = setTimeout(() => {
                setRadioOpen(false);
              }, 2000);
            } else {
              setRadioOpen(false);
              if (radioTimeout.current) clearTimeout(radioTimeout.current);
            }
          }}
          onTouchStart={e => {
            (window as any)._radioTouchHandled = true;
            e.stopPropagation();
            // Zeitstempel für Short-Tap
            (window as any)._radioTouchStart = Date.now();
          }}
          onTouchEnd={e => {
            e.stopPropagation();
            const start = (window as any)._radioTouchStart || 0;
            const duration = Date.now() - start;
            (window as any)._radioTouchStart = 0;
            // Nur Short-Tap (max 350ms) akzeptieren
            if (duration > 350) return;
            if (!radioOpen) {
              handleRadioEnter();
              if (radioTimeout.current) clearTimeout(radioTimeout.current);
              radioTimeout.current = setTimeout(() => {
                setRadioOpen(false);
              }, 2000);
            } else {
              setRadioOpen(false);
              if (radioTimeout.current) clearTimeout(radioTimeout.current);
            }
          }}
        >
          {/* Pulsating Animation Keyframes */}
          <style jsx global>{`
            @keyframes radio-pulse {
              0% { box-shadow: 0 0 0 0 rgba(120,120,120,0.45), 0 4px 16px rgba(34,197,94,0.10); }
              70% { box-shadow: 0 0 0 12px rgba(120,120,120,0), 0 4px 16px rgba(34,197,94,0.10); }
              100% { box-shadow: 0 0 0 0 rgba(120,120,120,0), 0 4px 16px rgba(34,197,94,0.10); }
            }
            .dark .animate-radio-pulse {
              animation: radio-pulse 1.6s cubic-bezier(0.4,0,0.6,1) infinite;
            }
          `}</style>
          {/* bi-broadcast Bootstrap Icon as SVG (exakt wie vom User) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 16 16"
            className="text-black dark:text-white"
            style={{ color: undefined }}
          >
            <path d="M3.05 3.05a7 7 0 0 0 0 9.9.5.5 0 0 1-.707.707 8 8 0 0 1 0-11.314.5.5 0 0 1 .707.707m2.122 2.122a4 4 0 0 0 0 5.656.5.5 0 1 1-.708.708 5 5 0 0 1 0-7.072.5.5 0 0 1 .708.708m5.656-.708a.5.5 0 0 1 .708 0 5 5 0 0 1 0 7.072.5.5 0 1 1-.708-.708 4 4 0 0 0 0-5.656.5.5 0 0 1 0-.708m2.122-2.12a.5.5 0 0 1 .707 0 8 8 0 0 1 0 11.313.5.5 0 0 1-.707-.707 7 7 0 0 0 0-9.9.5.5 0 0 1 0-.707zM10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/>
          </svg>
        </button>
        <div
          className={
            (radioOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none') +
            ' transition-opacity duration-300'
          }
          style={{ position: 'absolute', bottom: 70, right: 0, width: 320, maxWidth: '90vw' }}
        >
          <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#23232a] rounded-lg shadow-xl p-2">
            <iframe
              src="https://tunein.com/embed/player/s110052/"
              style={{ width: '100%', height: 100, border: 'none' }}
              scrolling="no"
              frameBorder="no"
              title="Radio Player 2"
              allow="autoplay"
            />
            <iframe
              src="https://tunein.com/embed/player/s165740/"
              style={{ width: '100%', height: 100, border: 'none' }}
              scrolling="no"
              frameBorder="no"
              title="Radio Player"
              allow="autoplay"
            />
          </div>
        </div>
      </div>
    </>
  )
}
