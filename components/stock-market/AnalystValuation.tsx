import { AlertCircle, CircleCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// You may need to pass selectedStock.price as a prop for correct comparison

interface AnalystValuationProps {
  symbol?: string | null;
  price?: number | null;
}

const AnalystValuation: React.FC<AnalystValuationProps> = ({ symbol, price }) => {
  const [valuation, setValuation] = useState<string>('Loading...');

  useEffect(() => {
    async function fetchValuation() {
      if (!symbol) {
        setValuation('Not available');
        return;
      }
      try {
        const proxyUrl = 'https://corsproxy.io/?';
        const finvizUrl = `https://finviz.com/quote.ashx?t=${symbol}`;
        const url = proxyUrl + encodeURIComponent(finvizUrl);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Finviz API error');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const cells = doc.querySelectorAll('td');
        let found = false;
        for (let i = 0; i < cells.length; i++) {
          if (cells[i].textContent?.trim() === 'Target Price' && cells[i + 1]) {
            setValuation(cells[i + 1].textContent?.trim() || 'Not available');
            found = true;
            break;
          }
        }
        if (!found) setValuation('Not available');
      } catch {
        setValuation('Not available');
      }
    }
    fetchValuation();
  }, [symbol]);

  // Parse valuation to number for comparison
  let valuationNum: number | null = null;
  if (valuation !== 'Not available' && valuation !== 'Loading...') {
    const cleaned = valuation.replace(/[^\d.]/g, '');
    valuationNum = cleaned ? Number(cleaned) : null;
  }

  let status: string | null = null;
  let statusClass = '';
  if (valuationNum !== null && price !== undefined && price !== null) {
    if (price > valuationNum) {
      status = 'Overvalued';
      statusClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    } else {
      status = 'Undervalued';
      statusClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    }
  }

  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F1F23] col-span-1">
      <p className="text-sm text-gray-600 dark:text-gray-400">Analyst Valuation</p>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900 dark:text-white text-sm">
          {valuation !== 'Not available' && valuation !== 'Loading...'
            ? `$${valuation}`
            : valuation}
        </span>
        {status && (
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${statusClass}`}
          >
            {status === 'Overvalued' ? (
              <AlertCircle className="w-3 h-3 text-red-500" />
            ) : (
              <CircleCheck className="w-3 h-3 text-green-500" />
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default AnalystValuation;
