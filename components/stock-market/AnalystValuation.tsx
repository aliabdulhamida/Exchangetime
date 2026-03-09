import React, { useEffect, useState } from 'react';

interface AnalystValuationProps {
  symbol?: string | null;
  price?: number | null;
}

const AnalystValuation: React.FC<AnalystValuationProps> = ({ symbol, price }) => {
  const [valuation, setValuation] = useState<string>('Loading...');

  useEffect(() => {
    let active = true;

    async function fetchValuation() {
      if (!symbol) {
        if (active) setValuation('Not available');
        return;
      }
      try {
        const url = `/api/analyst-consensus?symbol=${encodeURIComponent(symbol)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Consensus API error');
        const data = await response.json();
        const tp = data?.targetPrice;
        if (active) {
          setValuation(tp && tp !== '-' ? String(tp) : 'Not available');
        }
      } catch {
        if (active) setValuation('Not available');
      }
    }

    fetchValuation();

    return () => {
      active = false;
    };
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
      statusClass = 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    } else {
      status = 'Undervalued';
      statusClass = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    }
  }

  return (
    <div className="col-span-1 rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
        Analyst Valuation
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-foreground sm:text-lg">
          {valuation !== 'Not available' && valuation !== 'Loading...'
            ? `$${valuation}`
            : valuation}
        </span>
        {status && (
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusClass}`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
};

export default AnalystValuation;
