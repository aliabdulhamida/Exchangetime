'use client';

import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MarketNews {
  title: string;
  summary: string;
  impact: 'positive' | 'negative' | 'neutral';
  time: string;
}

export default function MarketSummary() {
  const [expanded, setExpanded] = useState(false);

  // Dynamische Marktwerte für die letzte abgeschlossene Woche (Mo–Fr)
  const [marketStats, setMarketStats] = useState({
    sp500: { value: '—', change: '—', positive: true },
    nasdaq: { value: '—', change: '—', positive: true },
    dow: { value: '—', change: '—', positive: true },
    vix: { value: '—', change: '—', positive: false },
  });

  useEffect(() => {
    function getLastCompletedWeek() {
      const today = new Date();
      const end = new Date(today);
      // Finde den letzten Freitag
      while (end.getDay() !== 5) {
        end.setDate(end.getDate() - 1);
      }
      const start = new Date(end);
      start.setDate(end.getDate() - 4); // Montag derselben Woche
      // Normalisiere Zeiten
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    async function fetchWeekly(symbol: string, invertPositive = false) {
      const { start, end } = getLastCompletedWeek();
      const period1 = Math.floor((start.getTime() - 2 * 24 * 60 * 60 * 1000) / 1000); // Puffer
      const period2 = Math.floor((end.getTime() + 1 * 24 * 60 * 60 * 1000) / 1000);
      const url = `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Fetch failed');
        const json: any = await res.json();
        const result = json?.chart?.result?.[0];
        const ts: number[] = result?.timestamp || [];
        const closes: number[] = result?.indicators?.quote?.[0]?.close || [];
        const points = (ts || [])
          .map((t, i) => ({ date: new Date(t * 1000), close: closes[i] }))
          .filter((p) => typeof p.close === 'number' && !isNaN(p.close));
        // Filter auf Wochenbereich
        const { start: s, end: e } = getLastCompletedWeek();
        const inWeek = points.filter((p) => p.date >= s && p.date <= e);
        if (inWeek.length < 2) return { value: '—', change: '—', positive: !invertPositive };
        const first = inWeek[0].close;
        const last = inWeek[inWeek.length - 1].close;
        const changePct = first ? ((last - first) / first) * 100 : 0;
        const valueStr =
          typeof last === 'number'
            ? last.toLocaleString('en-US', { maximumFractionDigits: 2 })
            : '—';
        const changeStr = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
        const positive = invertPositive ? changePct < 0 : changePct >= 0;
        return { value: valueStr, change: changeStr, positive };
      } catch (e) {
        return { value: '—', change: '—', positive: !invertPositive };
      }
    }

    (async () => {
      const [spx, ixic, dji, vix] = await Promise.all([
        fetchWeekly('^GSPC'),
        fetchWeekly('^IXIC'),
        fetchWeekly('^DJI'),
        fetchWeekly('^VIX', true), // VIX: Anstieg = negatives Risiko-Sentiment
      ]);
      setMarketStats({
        sp500: spx,
        nasdaq: ixic,
        dow: dji,
        vix: vix,
      } as any);
    })();
  }, []);

  const weeklyNews: MarketNews[] = [
    {
      title: 'Wall Street ended a choppy week with mega caps masking weak breadth',
      summary:
        'Large-cap tech and defensives underpinned the indexes while small caps remained more volatile amid policy headlines.',
      impact: 'neutral',
      time: 'Yesterday',
    },
    {
      title: 'Gold set a record as hedging demand rose; Treasury yields edged higher',
      summary:
        'A firmer dollar and higher real rates pressured some growth pockets while gold benefitted from risk hedging.',
      impact: 'neutral',
      time: 'This week',
    },
    {
      title: 'Tariff rhetoric and a Fed board nomination steered intraday swings',
      summary:
        'Traders positioned ahead of next week’s U.S. inflation data; September cut odds remain in focus.',
      impact: 'neutral',
      time: 'This week',
    },
  ];

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        Weekly Market Summary: Aug 04–08, 2025
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* S&P 500 */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
          <p className="text-xs text-gray-600 dark:text-gray-400">S&P 500</p>
          <p className="font-semibold text-gray-900 dark:text-white">{marketStats.sp500.value}</p>
          <div className="flex items-center gap-1">
            {marketStats.sp500.positive ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span
              className={
                marketStats.sp500.positive ? 'text-xs text-green-600' : 'text-xs text-red-600'
              }
            >
              {marketStats.sp500.change}
            </span>
          </div>
        </div>
        {/* NASDAQ */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
          <p className="text-xs text-gray-600 dark:text-gray-400">NASDAQ</p>
          <p className="font-semibold text-gray-900 dark:text-white">{marketStats.nasdaq.value}</p>
          <div className="flex items-center gap-1">
            {marketStats.nasdaq.positive ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span
              className={
                marketStats.nasdaq.positive ? 'text-xs text-green-600' : 'text-xs text-red-600'
              }
            >
              {marketStats.nasdaq.change}
            </span>
          </div>
        </div>
        {/* Dow Jones */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
          <p className="text-xs text-gray-600 dark:text-gray-400">Dow Jones</p>
          <p className="font-semibold text-gray-900 dark:text-white">{marketStats.dow.value}</p>
          <div className="flex items-center gap-1">
            {marketStats.dow.positive ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span
              className={
                marketStats.dow.positive ? 'text-xs text-green-600' : 'text-xs text-red-600'
              }
            >
              {marketStats.dow.change}
            </span>
          </div>
        </div>
        {/* VIX */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23]">
          <p className="text-xs text-gray-600 dark:text-gray-400">VIX</p>
          <p className="font-semibold text-gray-900 dark:text-white">{marketStats.vix.value}</p>
          <div className="flex items-center gap-1">
            {/* For VIX, green is down (risk-on); red is up (risk-off) */}
            {marketStats.vix.positive ? (
              <TrendingDown className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingUp className="w-3 h-3 text-red-500" />
            )}
            <span
              className={
                marketStats.vix.positive ? 'text-xs text-green-600' : 'text-xs text-red-600'
              }
            >
              {marketStats.vix.change}
            </span>
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
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    U.S. Markets: Week of Aug 04–08, 2025
                  </span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>
                      Choppy tape with narrower breadth: mega caps and defensives steadied the
                      indexes while small caps lagged and intraday swings stayed elevated.
                    </li>
                    <li>
                      Rates and policy: Treasury yields drifted higher; tariff headlines and a
                      potential Fed board nomination shaped risk appetite ahead of next week’s
                      CPI/PPI.
                    </li>
                    <li>
                      Positioning: investors rotated selectively within tech; AI/chips were
                      volatile, software mixed; healthcare posted idiosyncratic winners.
                    </li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Market internals & factors</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>
                      Quality/defensive tilt outperformed on rate sensitivity; momentum was choppy;
                      value held up in energy and parts of financials.
                    </li>
                    <li>
                      Liquidity concentrated in large platforms; equal‑weight benchmarks
                      underperformed their cap‑weighted peers.
                    </li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Earnings & single‑name moves</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>
                      Adtech and internet saw outsized post‑earnings reactions on guidance
                      revisions.
                    </li>
                    <li>
                      Semiconductors traded on AI/server demand signals and tariff chatter; pharma
                      names diverged on trial/launch updates.
                    </li>
                  </ul>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    Commodities, FX & credit
                  </span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>
                      Gold printed a fresh record on hedging demand; crude firmness supported energy
                      sentiment.
                    </li>
                    <li>
                      Dollar stayed bid at times on rate differentials; U.S. credit spreads were
                      broadly stable to slightly wider in high yield.
                    </li>
                  </ul>
                </div>
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <div>
                  <span className="font-semibold">Global snapshot</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>
                      Europe traded mildly higher as investors weighed geopolitical de‑escalation
                      signals and trade headlines.
                    </li>
                    <li>
                      Asia was mixed to softer; chip complexes were sensitive to prospective U.S.
                      tariff measures. Saudi Aramco flagged lower Q2 revenue ahead of an expected H2
                      demand pickup.
                    </li>
                  </ul>
                </div>
                <button
                  className="mt-4 px-4 py-2 rounded bg-white text-black border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center"
                  onClick={() => setExpanded(false)}
                  aria-label="Read less"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    U.S. Markets: Week of Aug 04–08, 2025
                  </span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>
                      Narrower breadth with large caps masking small‑cap volatility; policy
                      headlines kept intraday moves lively.
                    </li>
                    <li>
                      Yields up modestly; gold at record; eyes on next week’s inflation prints.
                    </li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Global</span>
                  <ul className="list-disc ml-7 mt-2 text-gray-700 dark:text-gray-300">
                    <li>
                      Europe mildly firmer; Asia mixed with chip stocks sensitive to tariff talk.
                    </li>
                  </ul>
                </div>
                <button
                  className="mt-4 px-4 py-2 rounded bg-white text-black border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center"
                  onClick={() => setExpanded(true)}
                  aria-label="Read more"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
