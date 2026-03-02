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
        const url = `/api/analyst-consensus?symbol=${encodeURIComponent(symbol)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Consensus API error');
        const data = await response.json();
        const tp = data?.targetPrice;
        setValuation(tp && tp !== '-' ? String(tp) : 'Not available');
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
    <div className="col-span-1 h-full rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Analyst Valuation</p>
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-foreground">
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
