'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Dialog, DialogTrigger, DialogContent, DialogHeader } from '@/components/ui/dialog';

export default function FearGreedIndex() {
  const [index, setIndex] = useState<number | null>(null);
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchFearGreedIndex = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/fear-greed', { method: 'GET' });
        if (!response.ok) {
          if (response.status === 429) setError('Too many requests. Please try again later.');
          else setError(`API error: ${response.status}`);
          setLoading(false);
          return;
        }
        const data = await response.json();
        const score: number = data.fgi.now.value;
        // Compute trend based on previous value kept in a ref
        const prev = prevIndexRef.current;
        if (prev !== null) {
          if (score > prev + 2) setTrend('up');
          else if (score < prev - 2) setTrend('down');
          else setTrend('neutral');
        }
        setIndex(score);
        prevIndexRef.current = score;
        setLoading(false);
      } catch (err) {
        setError('Error fetching data');
        setLoading(false);
      }
    };
    fetchFearGreedIndex();
    const interval = setInterval(fetchFearGreedIndex, 60000);
    return () => clearInterval(interval);
  }, []);

  // Farbverlauf von grün (0) zu rot (100)
  const getGradientColor = (value: number) => {
    // value: 0 (rot) bis 100 (grün)
    const r = Math.round(220 - (220 - 34) * (value / 100)); // 220 -> 34
    const g = Math.round(38 + (197 - 38) * (value / 100)); // 38 -> 197
    const b = Math.round(38 + (94 - 38) * (value / 100)); // 38 -> 94
    return `rgb(${r},${g},${b})`;
  };

  const getIndexLabel = (value: number | null) => {
    if (value === null) return { label: 'Loading...', color: '#9ca3af' };
    if (value <= 25) return { label: 'Extreme Fear', color: getGradientColor(0) };
    if (value <= 45) return { label: 'Fear', color: getGradientColor(25) };
    if (value <= 55) return { label: 'Neutral', color: getGradientColor(50) };
    if (value <= 75) return { label: 'Greed', color: getGradientColor(75) };
    return { label: 'Extreme Greed', color: getGradientColor(100) };
  };

  const indexInfo = getIndexLabel(index);

  // Animierter Kreis für Fear & Greed Wert
  const circleValue = index !== null ? Math.max(0, Math.min(100, index)) : 0;
  const circumference = 2 * Math.PI * 12;
  const offset = circumference - (circleValue / 100) * circumference;

  return (
    <Dialog>
      <div className="flex items-center gap-1 sm:gap-2 px-1 py-0.5 sm:px-2 sm:py-1 rounded">
        <svg
          width="14"
          height="14"
          viewBox="0 0 18 18"
          className="animate-spin-slow sm:w-[18px] sm:h-[18px] w-[14px] h-[14px]"
          style={{
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          }}
        >
          <circle
            cx="9"
            cy="9"
            r="7"
            fill="none"
            stroke={getGradientColor(circleValue)}
            strokeWidth="3"
            strokeDasharray={2 * Math.PI * 7}
            strokeDashoffset={2 * Math.PI * 7 - (circleValue / 100) * (2 * Math.PI * 7)}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <span className="font-bold text-[10px] sm:text-xs" style={{ color: indexInfo.color }}>
          {index !== null ? Math.round(index) : '-'}
        </span>
        <DialogTrigger asChild>
          <button
            className="text-[9px] sm:text-[10px] font-medium underline underline-offset-2 bg-transparent p-0 m-0 border-none cursor-pointer hover:text-blue-600 transition"
            style={{ color: indexInfo.color, background: 'none' }}
          >
            {indexInfo.label}
          </button>
        </DialogTrigger>
        {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500 ml-1" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500 ml-1" />}
      </div>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <span className="text-xl font-semibold tracking-tight">Fear & Greed Index</span>
          <p className="mt-1 text-sm text-muted-foreground">
            A sentiment gauge for market psychology, from panic to exuberance.
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-foreground/90">
              The <span className="font-semibold text-foreground">Fear & Greed Index</span> tracks
              investor sentiment. Lower values suggest fear and risk aversion, while higher values
              indicate optimism and stronger risk appetite.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <h4 className="mb-1 text-sm font-semibold text-foreground">How It Is Calculated</h4>
              <p className="text-muted-foreground">
                The score combines market volatility, momentum, options positioning, volume, and
                safe-haven demand into one weighted sentiment signal.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <h4 className="mb-1 text-sm font-semibold text-foreground">How To Use It</h4>
              <p className="text-muted-foreground">
                It helps spot emotional extremes that can precede reversals. It is context, not a
                standalone buy or sell signal.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">Sentiment Ranges</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <span className="font-semibold text-red-500">Extreme Fear</span>
                <span className="text-xs font-medium text-muted-foreground">0-25</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
                <span className="font-semibold text-orange-400">Fear</span>
                <span className="text-xs font-medium text-muted-foreground">26-45</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                <span className="font-semibold text-yellow-400">Neutral</span>
                <span className="text-xs font-medium text-muted-foreground">46-55</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                <span className="font-semibold text-green-500">Greed</span>
                <span className="text-xs font-medium text-muted-foreground">56-75</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <span className="font-semibold text-emerald-500">Extreme Greed</span>
                <span className="text-xs font-medium text-muted-foreground">76-100</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
