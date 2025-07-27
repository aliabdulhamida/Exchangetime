"use client"

import { TrendingUp, TrendingDown, Search, AlertTriangle } from "lucide-react"
import { ChartContainer } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useState, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"

interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  dcf?: number
  pe?: number
  peg?: number
  pb?: number
  roe?: number
  netMargin?: number
  roic?: number
  revenueGrowth?: number
  earningsGrowth?: number
  epsGrowth?: number
  debtEquity?: number
  currentRatio?: number
  freeCashFlow?: string
}

export default function StockAnalysis() {
  const [loading, setLoading] = useState(false);
  // --- Hilfsfunktionen für zusätzliche Metriken ---
  type Metrics = {
    peRatio?: number;
    pbRatio?: number;
    pegRatio?: number;
    eps?: number;
    revenue?: number;
    beta?: number;
    roe?: number;
    debtToEquity?: number;
    profitMargin?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    epsGrowth?: number;
    roic?: number;
    currentRatio?: number;
    freeCashFlow?: number;
    forwardPE?: number;
    dividendYield?: number;
  };

  async function fetchAdditionalMetrics(symbol: string): Promise<Metrics> {
    try {
      const finvizMetrics = await fetchFinvizMetrics(symbol);
      if (finvizMetrics && Object.values(finvizMetrics).some(value => value !== undefined)) {
        try {
          const yahooMetrics = await fetchYahooFinanceMetrics(symbol);
          if (yahooMetrics) {
            return {
              peRatio: finvizMetrics.peRatio !== undefined ? finvizMetrics.peRatio : yahooMetrics.peRatio,
              pbRatio: finvizMetrics.pbRatio !== undefined ? finvizMetrics.pbRatio : yahooMetrics.pbRatio,
              pegRatio: finvizMetrics.pegRatio !== undefined ? finvizMetrics.pegRatio : yahooMetrics.pegRatio,
              eps: finvizMetrics.eps !== undefined ? finvizMetrics.eps : yahooMetrics.eps,
              revenue: finvizMetrics.revenue !== undefined ? finvizMetrics.revenue : yahooMetrics.revenue,
              beta: finvizMetrics.beta !== undefined ? finvizMetrics.beta : yahooMetrics.beta,
              roe: finvizMetrics.roe !== undefined ? finvizMetrics.roe : yahooMetrics.roe,
              debtToEquity: finvizMetrics.debtToEquity !== undefined ? finvizMetrics.debtToEquity : yahooMetrics.debtToEquity,
              profitMargin: finvizMetrics.profitMargin !== undefined ? finvizMetrics.profitMargin : yahooMetrics.profitMargin,
              revenueGrowth: finvizMetrics.revenueGrowth !== undefined ? finvizMetrics.revenueGrowth : yahooMetrics.revenueGrowth,
              earningsGrowth: finvizMetrics.earningsGrowth !== undefined ? finvizMetrics.earningsGrowth : yahooMetrics.earningsGrowth,
              epsGrowth: finvizMetrics.epsGrowth !== undefined ? finvizMetrics.epsGrowth : yahooMetrics.epsGrowth,
              roic: finvizMetrics.roic !== undefined ? finvizMetrics.roic : yahooMetrics.roic,
              currentRatio: finvizMetrics.currentRatio !== undefined ? finvizMetrics.currentRatio : yahooMetrics.currentRatio,
              freeCashFlow: finvizMetrics.freeCashFlow !== undefined ? finvizMetrics.freeCashFlow : yahooMetrics.freeCashFlow,
              forwardPE: finvizMetrics.forwardPE !== undefined ? finvizMetrics.forwardPE : yahooMetrics.forwardPE,
              dividendYield: finvizMetrics.dividendYield !== undefined ? finvizMetrics.dividendYield : yahooMetrics.dividendYield
            };
          }
        } catch (yahooError) {}
        return finvizMetrics;
      }
      return await fetchYahooFinanceMetrics(symbol);
    } catch (error) {
      return {};
    }
  }

  async function fetchFinvizMetrics(symbol: string): Promise<Metrics> {
    try {
      const proxyUrl = 'https://corsproxy.io/?';
      const finvizUrl = `https://finviz.com/quote.ashx?t=${symbol}`;
      const url = proxyUrl + encodeURIComponent(finvizUrl);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Finviz API returned status ${response.status}`);
      const html = await response.text();
      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const extractMetric = (labelText: string) => {
        const cells = doc.querySelectorAll('td');
        for (let i = 0; i < cells.length; i++) {
          if (cells[i].textContent?.trim() === labelText && cells[i + 1]) {
            return cells[i + 1].textContent?.trim() || null;
          }
        }
        return null;
      };
      // Extract key metrics
      const peRatio = extractMetric('P/E') || extractMetric('PE');
      const pbRatio = extractMetric('P/B') || extractMetric('PB');
      const pegRatio = extractMetric('PEG');
      const eps = extractMetric('EPS (ttm)') || extractMetric('EPS');
      const revenue = extractMetric('Sales') || extractMetric('Revenue');
      const beta = extractMetric('Beta');
      const roe = extractMetric('ROE');
      const debtToEquity = extractMetric('Debt/Eq') || extractMetric('Debt/Equity');
      const profitMargin = extractMetric('Profit M') || extractMetric('Profit Margin');
      const revenueGrowth = extractMetric('Sales Q/Q') || extractMetric('Rev Growth');
      const earningsGrowth = extractMetric('EPS Q/Q') || extractMetric('Earnings Growth');
      const epsGrowth = extractMetric('EPS next Y') || extractMetric('EPS Growth');
      const roic = extractMetric('ROI') || extractMetric('ROIC');
      const currentRatio = extractMetric('Current R') || extractMetric('Current Ratio');
      const freeCashFlow = extractMetric('FCF') || extractMetric('Free Cash Flow');
      const forwardPE = extractMetric('Forward P/E') || extractMetric('Fwd P/E');
      const dividendYield = extractMetric('Dividend %') || extractMetric('Div Yield');
      // Hilfsfunktionen
      const parsePercent = (value: string|null): number|undefined => {
        if (!value || value === '-') return undefined;
        const cleaned = value.replace('%', '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
      };
      const parseNumber = (value: string|null): number|undefined => {
        if (!value || value === '-') return undefined;
        const num = parseFloat(value);
        return isNaN(num) ? undefined : num;
      };
      const parseLargeNumber = (value: string|null): number|undefined => {
        if (!value || value === '-') return undefined;
        const multipliers: any = { 'B': 1e9, 'M': 1e6, 'K': 1e3 };
        const match = value.match(/^([\d.]+)([BMK]?)$/);
        if (match) {
          const num = parseFloat(match[1]);
          const suffix = match[2];
          return suffix ? num * multipliers[suffix] : num;
        }
        return undefined;
      };
      return {
        peRatio: parseNumber(peRatio),
        pbRatio: parseNumber(pbRatio),
        pegRatio: parseNumber(pegRatio),
        eps: parseNumber(eps),
        revenue: parseLargeNumber(revenue),
        beta: parseNumber(beta),
        roe: parsePercent(roe),
        debtToEquity: parseNumber(debtToEquity),
        profitMargin: parsePercent(profitMargin),
        revenueGrowth: parsePercent(revenueGrowth),
        earningsGrowth: parsePercent(earningsGrowth),
        epsGrowth: parsePercent(epsGrowth),
        roic: parsePercent(roic),
        currentRatio: parseNumber(currentRatio),
        freeCashFlow: parseLargeNumber(freeCashFlow),
        forwardPE: parseNumber(forwardPE),
        dividendYield: parsePercent(dividendYield)
      };
    } catch (error) {
      return {};
    }
  }

  async function fetchYahooFinanceMetrics(symbol: string): Promise<Metrics> {
    // Dummy: gibt nur leere Werte zurück, kann bei Bedarf erweitert werden
    return {};
  }
  const [searchSymbol, setSearchSymbol] = useState("")
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dcfValue, setDcfValue] = useState<number | null>(null)
  // chartData: für aktuellen Range, fullChartData: für YTD/52W
  const [chartData, setChartData] = useState<{ name: string; price: number }[]>([])
  const [fullChartData, setFullChartData] = useState<{ name: string; price: number, date: Date }[]>([])
  const [chartRange, setChartRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'YTD' | '52W'>('1M');

  // Chart-Farbe je nach Entwicklung
  const chartIsPositive = chartData.length > 1 && chartData[chartData.length - 1].price >= chartData[0].price;
  const chartColor = chartIsPositive ? '#38FFB7' : '#FF3860';

  // Hilfsfunktion für Prozentveränderung
  function calcPercentChange(data: { price: number }[]): number | null {
    if (!data || data.length < 2) return null;
    const first = data[0].price;
    const last = data[data.length - 1].price;
    if (!first || !last) return null;
    return ((last - first) / first) * 100;
  }


  // YTD und 52W Daten immer aus dem vollen Datensatz berechnen
  const ytdData = useMemo(() => {
    if (!selectedStock) return [];
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return fullChartData.filter(d => d.date >= startOfYear && d.date <= now);
  }, [fullChartData, selectedStock]);

  const week52Data = useMemo(() => {
    if (!selectedStock) return [];
    if (fullChartData.length < 2) return [];
    // Letzte 365 Tage
    return fullChartData.slice(-Math.min(fullChartData.length, 365));
  }, [fullChartData, selectedStock]);

  const ytdChange = useMemo(() => calcPercentChange(ytdData), [ytdData]);
  const week52Change = useMemo(() => calcPercentChange(week52Data), [week52Data]);


  // Hilfsfunktion für Zeiträume
  function getRangeDays(range: '1M' | '3M' | '6M' | '1Y' | 'YTD' | '52W') {
    switch (range) {
      case '1M': return 31;
      case '3M': return 93;
      case '6M': return 186;
      case '1Y': return 365;
      case 'YTD': {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const diff = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
      }
      case '52W': return 365;
      default: return 31;
    }
  }


  // Holt immer alle verfügbaren Daten für YTD/52W, filtert für Chart-Range
  async function fetchChartData(symbol: string, range: '1M' | '3M' | '6M' | '1Y' | 'YTD' | '52W') {
    const endDate = Math.floor(Date.now() / 1000);
    // Hole immer 5 Jahre für vollen Verlauf (maximal für YTD/52W)
    const startDateFull = endDate - 5 * 365 * 24 * 60 * 60;
    const yahooUrlFull = `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDateFull}&period2=${endDate}&interval=1d&includePrePost=false`;
    const yahooResFull = await fetch(yahooUrlFull);
    if (!yahooResFull.ok) {
      setChartData([]);
      setFullChartData([]);
      return;
    }
    const yahooJsonFull = await yahooResFull.json();
    const timestampsFull = yahooJsonFull?.chart?.result?.[0]?.timestamp;
    const closesFull = yahooJsonFull?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    let fullArr: { name: string; price: number; date: Date }[] = [];
    if (timestampsFull && closesFull && Array.isArray(timestampsFull) && Array.isArray(closesFull)) {
      fullArr = timestampsFull.map((ts: number, idx: number) => {
        const date = new Date(ts * 1000);
        let label: string;
        if (['1M', '3M', '6M'].includes(range)) {
          // z.B. 25. Jul
          label = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
        } else {
          // z.B. Jul 25
          label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
        return { name: label, price: closesFull[idx], date };
      }).filter(d => typeof d.price === 'number' && !isNaN(d.price));
    }
    setFullChartData(fullArr);

    // Jetzt für den Chart-Range filtern
    let chartArr: { name: string; price: number }[] = [];
    if (fullArr.length > 0) {
      let filtered = fullArr;
      if (range === 'YTD') {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        filtered = fullArr.filter(d => d.date >= startOfYear && d.date <= now);
      } else if (range === '52W') {
        filtered = fullArr.slice(-Math.min(fullArr.length, 365));
      } else {
        const days = getRangeDays(range);
        filtered = fullArr.slice(-Math.min(fullArr.length, days));
      }
      chartArr = filtered.map(d => ({ name: d.name, price: d.price }));
    }
    setChartData(chartArr);
  }

  const handleSearch = async () => {
    if (!searchSymbol) return;
    setError(null);
    setLoading(true);
    try {
      const symbol = searchSymbol.toUpperCase();
      await fetchChartData(symbol, chartRange);
      // ...existing code...
      const yahooUrl = `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const yahooRes = await fetch(yahooUrl);
      if (!yahooRes.ok) {
        setError(`Error fetching data: ${yahooRes.status}`);
        setSelectedStock(null);
        setDcfValue(null);
        setChartData([]);
        setLoading(false);
        return;
      }
      const yahooJson = await yahooRes.json();
      const meta = yahooJson?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      const previousClose = meta?.previousClose;
      const change = price && previousClose ? price - previousClose : 0;
      const changePercent = change && previousClose ? (change / previousClose) * 100 : 0;

      // ...existing code...

      // Hole zusätzliche Metriken (Finviz + Yahoo Fallback)
      const metrics = await fetchAdditionalMetrics(symbol);

      // DCF von financialmodellingprep.com
      let dcf = null;
      try {
        const dcfUrl = `https://financialmodelingprep.com/api/v3/discounted-cash-flow/${symbol}?apikey=dLA2mkbn8dXaP4RoeGungdPJzNTiYRix`;
        const dcfRes = await fetch(dcfUrl);
        if (dcfRes.ok) {
          const dcfJson = await dcfRes.json();
          dcf = dcfJson?.dcf || dcfJson[0]?.dcf || null;
          setDcfValue(dcf);
        } else {
          setDcfValue(null);
        }
      } catch (dcfErr) {
        setDcfValue(null);
      }

      if (meta && price) {
        setSelectedStock({
          symbol: symbol,
          name: meta?.longName || meta?.shortName || meta?.symbol || symbol,
          price: price,
          change: change,
          changePercent: changePercent,
          dcf: dcf,
          pe: metrics?.peRatio,
          peg: metrics?.pegRatio,
          pb: metrics?.pbRatio,
          roe: metrics?.roe,
          netMargin: metrics?.profitMargin,
          roic: metrics?.roic,
          revenueGrowth: metrics?.revenueGrowth,
          earningsGrowth: metrics?.earningsGrowth,
          epsGrowth: metrics?.epsGrowth,
          debtEquity: metrics?.debtToEquity,
          currentRatio: metrics?.currentRatio,
          freeCashFlow: typeof metrics?.freeCashFlow === "number" ? `$${(metrics.freeCashFlow/1e9).toFixed(2)}B` : undefined,
        });
      } else {
        setError('Error fetching data.');
        setSelectedStock(null);
        setChartData([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Unbekannter Fehler beim Fetch.');
      setSelectedStock(null);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        Stock Analysis
      </h2>

      {/* Chart: Kursverlauf (dynamisch von Yahoo Finance) wird nach DCF angezeigt */}

      <div className="flex gap-2 mb-5">
        <Input
          placeholder="Enter ticker (e.g. AAPL)"
          value={searchSymbol}
          onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="mb-4 flex flex-col items-center border border-red-400 dark:border-red-500 bg-red-50/60 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg p-4"
        >
          <div className="flex flex-col items-center">
            <AlertTriangle className="w-8 h-8 mb-2 text-red-500 dark:text-red-400" />
            <span className="text-center font-normal">{error}</span>
          </div>
        </Alert>
      )}
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="text-right">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-[#18181b] col-span-1 space-y-2">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23] col-span-2">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="col-span-2 mt-6">
              <Skeleton className="h-40 w-full mb-2" />
              <div className="flex gap-4 mt-2 justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </div>
        </div>
      ) : selectedStock ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedStock.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedStock.symbol}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white">${selectedStock.price?.toFixed(2)}</p>
              <div className="flex items-center gap-1">
                {selectedStock.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${selectedStock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {selectedStock.change >= 0 ? "+" : ""}
                  {selectedStock.change?.toFixed(2)} ({selectedStock.changePercent?.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* VALUATION */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#18181b] col-span-1">
              <h4 className="font-semibold mb-2 text-sm text-gray-900 dark:text-white">Valuation</h4>
              <div className="flex justify-between items-center mb-1 text-sm"><span>P/E Ratio</span><span>{selectedStock.pe ?? "-"}</span></div>
              <div className="flex justify-between items-center mb-1 text-sm"><span>PEG Ratio</span><span>{selectedStock.peg ?? "-"}</span></div>
              <div className="flex justify-between items-center mb-1 text-sm"><span>P/B Ratio</span><span>{selectedStock.pb ?? "-"}</span></div>
            </div>
            {/* PROFITABILITY */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#18181b] col-span-1">
              <h4 className="font-semibold mb-2 text-sm text-gray-900 dark:text-white">Profitability</h4>
              <div className="flex justify-between items-center mb-1 text-sm"><span>ROE</span><span>{selectedStock.roe ? `${selectedStock.roe}%` : "-"}</span></div>
              <div className="flex justify-between items-center mb-1 text-sm"><span>Net Margin</span><span>{selectedStock.netMargin ? `${selectedStock.netMargin}%` : "-"}</span></div>
              <div className="flex justify-between items-center mb-1 text-sm"><span>ROIC</span><span>{selectedStock.roic ? `${selectedStock.roic}%` : "-"}</span></div>
            </div>
            {/* GROWTH */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#18181b] col-span-1">
              <h4 className="font-semibold mb-2 text-sm text-gray-900 dark:text-white">Growth</h4>
              <div className="flex justify-between items-center mb-1 text-sm"><span>Revenue Growth</span><span>{selectedStock.revenueGrowth ? `${selectedStock.revenueGrowth}%` : "-"}</span></div>
              <div className="flex justify-between items-center mb-1 text-sm"><span>Earnings Growth</span><span>{selectedStock.earningsGrowth ? `${selectedStock.earningsGrowth}%` : "-"}</span></div>
              <div className="flex justify-between items-center mb-1 text-sm"><span>EPS Growth</span><span>{selectedStock.epsGrowth ? `${selectedStock.epsGrowth}%` : "-"}</span></div>
            </div>
            {/* FINANCIAL HEALTH */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#18181b] col-span-1">
              <h4 className="font-semibold mb-2 text-sm text-gray-900 dark:text-white">Financial Health</h4>
              <div className="flex justify-between items-center mb-1 text-sm"><span>Debt/Equity</span><span>{selectedStock.debtEquity ?? "-"}</span></div>
              <div className="flex justify-between items-center mb-1 text-sm"><span>Current Ratio</span><span>{selectedStock.currentRatio ?? "-"}</span></div>
              <div className="flex justify-between items-center mb-1 text-sm"><span>Free Cash Flow</span><span>{selectedStock.freeCashFlow ?? "-"}</span></div>
            </div>
            {/* DCF Valuation */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23] col-span-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">DCF Valuation</p>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {selectedStock.dcf !== undefined && selectedStock.dcf !== null ? `$${Number(selectedStock.dcf).toFixed(2)}` : "Not available"}
                </span>
                {selectedStock.dcf !== undefined && selectedStock.dcf !== null && selectedStock.price !== undefined && selectedStock.price !== null && (
                  <span className={`text-xs font-bold px-2 py-1 rounded ${Number(selectedStock.price) > Number(selectedStock.dcf) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                    {Number(selectedStock.price) > Number(selectedStock.dcf) ? 'Overvalued' : 'Undervalued'}
                  </span>
                )}
              </div>
            </div>
            {/* Chart: Kursverlauf (dynamisch von Yahoo Finance) */}
            <div className="col-span-2 mt-6">
              <ChartContainer config={{ price: { label: "Price", color: "#2563eb" } }}>
                <ResponsiveContainer width="100%" height={300}>
                  {chartData.length > 0 ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColor} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#a1a1aa' }} minTickGap={30} />
                      <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} width={80} domain={["auto", "auto"]} tickFormatter={(v: number) => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M' : v >= 1_000 ? (v/1_000).toFixed(1)+'K' : v.toLocaleString()} />
                      <Tooltip
                        content={({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
                          if (!active || !payload || !payload.length) return null;
                          return (
                            <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg px-2 py-1 shadow-lg text-[11px] min-w-[80px]" style={{ lineHeight: 1.2 }}>
                              <div className="mb-0.5" style={{ color: chartColor, fontSize: '11px' }}>{label}</div>
                              <div><span style={{ color: chartColor, fontSize: '11px' }}>Price:</span> ${payload[0]?.payload?.price?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="price" stroke={chartColor} fillOpacity={1} fill="url(#colorPrice)" name="Price" />
                    </AreaChart>
                  ) : (
                    <div className="text-gray-400 dark:text-gray-600 text-sm">No data available.</div>
                  )}
                </ResponsiveContainer>
              </ChartContainer>
              <div className="flex gap-4 mt-2 justify-between items-center">
                <div className="flex gap-2">
                  {(['1M','3M','6M','1Y'] as const).map(r => (
                    <button
                      key={r}
                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${chartRange === r ? 'bg-white text-black border-gray-300 dark:border-[#333]' : 'bg-gray-100 dark:bg-[#222] border-gray-300 dark:border-[#333] text-black dark:text-gray-200'}`}
                      onClick={async () => {
                        setChartRange(r);
                        if (selectedStock) await fetchChartData(selectedStock.symbol, r);
                      }}
                    >{r}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs">
                    <div>
                      <span>YTD:</span>
                      <span className={ytdChange !== null ? (ytdChange >= 0 ? 'text-green-600 dark:text-green-400 ml-1' : 'text-red-600 dark:text-red-400 ml-1') : 'ml-1'}>
                        {ytdChange !== null ? `${ytdChange > 0 ? '+' : ''}${ytdChange.toFixed(2)}%` : '–'}
                      </span>
                    </div>
                    <div>
                      <span>52W:</span>
                      <span className={week52Change !== null ? (week52Change >= 0 ? 'text-green-600 dark:text-green-400 ml-1' : 'text-red-600 dark:text-red-400 ml-1') : 'ml-1'}>
                        {week52Change !== null ? `${week52Change > 0 ? '+' : ''}${week52Change.toFixed(2)}%` : '–'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 The provided stock analysis data is for informational purposes only and does not constitute investment advice.
          </p>
        </div>
      )}
    </div>
  )
}
