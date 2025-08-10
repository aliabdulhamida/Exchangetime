'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ConsensusData = {
  analystRecommendation: string;
  targetPrice: string;
};

export default function AnalystConsensus() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consensus, setConsensus] = useState<ConsensusData | null>(null);

  const fetchConsensus = async () => {
    setLoading(true);
    setError(null);
    setConsensus(null);
    try {
      // Yahoo Finance API (inoffiziell, öffentlich)
      const url = `https://corsproxy.io/?https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=financialData,recommendationTrend`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fehler beim Laden der Analystenmeinungen.');
      const json = await res.json();
      const rec = json?.quoteSummary?.result?.[0]?.recommendationTrend?.trend?.[0];
      const fin = json?.quoteSummary?.result?.[0]?.financialData;
      let analystRecommendation = '-';
      if (rec) {
        // Finde das Rating mit der höchsten Anzahl
        const ratings = [
          { label: 'Strong Buy', value: rec.strongBuy },
          { label: 'Buy', value: rec.buy },
          { label: 'Hold', value: rec.hold },
          { label: 'Sell', value: rec.sell },
          { label: 'Strong Sell', value: rec.strongSell },
        ];
        const best = ratings.reduce((a, b) => (b.value > a.value ? b : a), ratings[0]);
        analystRecommendation = `${best.label} (${best.value})`;
      }
      let targetPrice = '-';
      if (fin?.targetMeanPrice?.fmt) {
        targetPrice = fin.targetMeanPrice.fmt;
      }
      setConsensus({ analystRecommendation, targetPrice });
    } catch (e: any) {
      setError(e.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] min-h-[300px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Analyst Consensus</h2>
      </div>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Enter stock symbol (e.g., AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="flex-1"
        />
        <Button onClick={fetchConsensus} disabled={loading}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Button>
      </div>
      {loading && <div className="text-gray-500 dark:text-gray-400">Loading...</div>}
      {error && <div className="text-red-500 dark:text-red-400">{error}</div>}
      {consensus && (
        <div className="space-y-2 mt-2">
          <div>
            <span className="font-semibold">Analyst Consensus:</span>{' '}
            {consensus.analystRecommendation}
          </div>
          <div>
            <span className="font-semibold">Price Target:</span> {consensus.targetPrice}
          </div>
        </div>
      )}
    </div>
  );
}
