"use client"

import { Users, TrendingUp, TrendingDown, Search, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface InsiderTrade {
  company: string
  symbol: string
  insider: string
  position: string
  transaction: string
  shares: number
  price: number
  value: number
  date: string
}

export default function InsiderTrades() {
  // ...existing code...
  const [ticker, setTicker] = useState("")
  const [trades, setTrades] = useState<InsiderTrade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>("")

  const fetchInsiderTrades = async () => {
    setLoading(true)
    setError(null)
    setTrades([])
    setCompanyName("")
    try {
      const finvizUrl = `https://finviz.com/quote.ashx?t=${ticker}`
      const proxyUrl = 'https://corsproxy.io/?'
      const response = await fetch(`${proxyUrl}${encodeURIComponent(finvizUrl)}`)
      if (!response.ok) throw new Error(`Error fetching data: ${response.status}`)
      const html = await response.text()
      // Parse HTML for trades
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      // Try to extract company name from title
      const title = doc.querySelector('title')?.textContent || ticker
      // Entferne alles vor 'Stock Price and Quote' und Klammern
      let name = title
      if (name.includes('Stock Price and Quote')) {
        name = name.split('Stock Price and Quote')[0].replace(/^[A-Z]+\s*-\s*/,'').trim()
      } else {
        name = name.split('(')[0].replace(/^[A-Z]+\s*-\s*/,'').trim()
      }
      setCompanyName(name)
      // Find insider table
      const insiderTable = [...doc.querySelectorAll('table.body-table')].find(table => {
        const headers = table.querySelectorAll('th')
        return [...headers].some(th => th.textContent?.includes('Insider Trading'))
      })
      const parsedTrades: InsiderTrade[] = []
      if (insiderTable) {
        const rows = insiderTable.querySelectorAll('tr')
        rows.forEach((row, idx) => {
          if (idx === 0) return // skip header
          const cells = row.querySelectorAll('td')
          if (cells.length >= 6) {
            parsedTrades.push({
              company: companyName,
              symbol: ticker,
              insider: cells[1]?.textContent?.trim() || "-",
              position: cells[2]?.textContent?.trim() || "-",
              transaction: cells[3]?.textContent?.trim() || "-",
              shares: Number(cells[5]?.textContent?.replace(/[^\d.-]/g, "")) || 0,
              price: Number(cells[4]?.textContent?.replace(/[^\d.-]/g, "")) || 0,
              value: (Number(cells[5]?.textContent?.replace(/[^\d.-]/g, "")) || 0) * (Number(cells[4]?.textContent?.replace(/[^\d.-]/g, "")) || 0),
              date: cells[0]?.textContent?.trim() || "-"
            })
          }
        })
      }
      setTrades(parsedTrades)
      if (parsedTrades.length === 0) setError("No insider trades found.")
    } catch (err: any) {
      setError(err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // Statistiken für Buy/Sell
  // Erweiterte Erkennung für Buy-Transaktionen
  const buyRegex = /buy|purchase|acq|acquisition|award|option|gift/i;
  const sellRegex = /sell|sale|dispose|disposition/i;
  const buyCount = trades.filter(t => buyRegex.test(t.transaction)).length;
  const sellCount = trades.filter(t => sellRegex.test(t.transaction)).length;
  const buyVolume = trades.filter(t => buyRegex.test(t.transaction)).reduce((sum, t) => sum + t.value, 0);
  const sellVolume = trades.filter(t => sellRegex.test(t.transaction)).reduce((sum, t) => sum + t.value, 0);

  function formatCompactNumber(num: number) {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-2xl p-8 border border-gray-200 dark:border-[#1F1F23] max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Insider Trades
      </h2>
      <div className="flex gap-2 mb-4">
        <Input
          value={ticker}
          onChange={e => setTicker(e.target.value.toUpperCase())}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              fetchInsiderTrades();
            }
          }}
          placeholder="Enter ticker (e.g. AAPL)"
          className="w-64"
        />
        <Button onClick={fetchInsiderTrades} disabled={loading}>
          <Search className="w-4 h-4" />
        </Button>
      </div>
      {loading && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="flex flex-col justify-center min-h-[48px] w-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between w-full">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[420px] h-[420px] overflow-y-auto pr-2 mt-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="flex flex-col px-6 py-5 min-h-[160px] relative">
                <CardContent className="flex flex-col p-0 h-full">
                  <div className="flex items-start justify-between w-full mb-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-3 w-20 mb-2" />
                  <div className="flex flex-row items-end justify-between w-full mt-auto gap-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {companyName && <div className="mb-2 text-blue-700 dark:text-blue-300 font-semibold">{companyName}</div>}
      {trades.length > 0 && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Card className="flex flex-col justify-center min-h-[48px] w-full">
            <CardContent className="p-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Buy Transactions</span>
                <span className="text-base font-bold text-green-400 dark:text-[#38FFB7] break-words">{buyCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="flex flex-col justify-center min-h-[48px] w-full">
            <CardContent className="p-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sell Transactions</span>
                <span className="text-base font-bold text-red-500 dark:text-[#FF3860] break-words">{sellCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="flex flex-col justify-center min-h-[48px] w-full">
            <CardContent className="p-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Buy Volume</span>
                <span className="text-base font-bold text-green-400 dark:text-[#38FFB7] break-words">${formatCompactNumber(buyVolume)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="flex flex-col justify-center min-h-[48px] w-full">
            <CardContent className="p-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sell Volume</span>
                <span className="text-base font-bold text-red-500 dark:text-[#FF3860] break-words">${formatCompactNumber(sellVolume)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {trades.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[420px] h-[420px] overflow-y-auto pr-2">
          {trades.map((trade, index) => (
            <Card
              key={index}
              className="flex flex-col px-6 py-5 min-h-[160px] relative"
            >
              <CardContent className="flex flex-col p-0 h-full">
                {/* Top Row: Titel und Sale-Badge nebeneinander */}
                <div className="flex items-start w-full mb-6 relative">
                  <div className="absolute left-0 -top-1 text-xs font-extrabold text-card-foreground uppercase tracking-tight leading-tight max-w-[70%] break-words">{trade.position}</div>
                  {/* Badges absolut oben rechts platzieren */}
                  <div className="absolute -right-4 -top-2 flex gap-1">
                    {sellRegex.test(trade.transaction) && (
                      <span className="text-red-400 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1" style={{letterSpacing: 1}}>
                        <ArrowDownCircle className="w-3 h-3 mr-0.5" /> Sale
                      </span>
                    )}
                    {buyRegex.test(trade.transaction) && (
                      <span className="text-green-400 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1" style={{letterSpacing: 1}}>
                        <ArrowUpCircle className="w-3 h-3 mr-0.5" /> Buy
                      </span>
                    )}
                  </div>
                </div>
                {/* Datum und Name */}
                <div className="text-[10px] font-bold text-card-foreground flex justify-center mt-2 mb-0.5">{trade.date}</div>
                <div className="text-[10px] text-muted-foreground text-center mb-2">{trade.insider}</div>
                {/* Werte */}
                <div className="flex flex-row items-end justify-between w-full mt-auto gap-2">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[9px] text-muted-foreground font-semibold mb-0.5">PRICE</span>
                    <span className="text-xs font-bold text-card-foreground">${trade.price.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[9px] text-muted-foreground font-semibold mb-0.5">SHARES</span>
                    <span className="text-xs font-bold text-card-foreground">{formatCompactNumber(trade.shares)}</span>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[9px] text-muted-foreground font-semibold mb-0.5">VALUE</span>
                    <span className="text-xs font-bold text-card-foreground">${formatCompactNumber(trade.value)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <p className="text-xs text-blue-600 dark:text-blue-400">
          💡 Insider trading data is reported with a delay and should be used for informational purposes only.
        </p>
      </div>
    </div>
  )
}
