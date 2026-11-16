'use client';

import { memo, useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const Sparkline = memo(function Sparkline({
  prices,
  negative = false,
}: {
  prices: number[];
  negative?: boolean;
}) {
  if (prices.length < 2) return <span className="market-sparkline-placeholder" aria-hidden />;
  const minimum = Math.min(...prices);
  const span = Math.max(...prices) - minimum || 1;
  const points = prices
    .map(
      (price, index) =>
        `${(index / (prices.length - 1)) * 96},${29 - ((price - minimum) / span) * 25}`,
    )
    .join(' ');
  return (
    <svg className="market-sparkline" viewBox="-2 0 100 34" aria-hidden fill="none">
      <polyline
        points={points}
        stroke={negative ? 'var(--finance-negative)' : 'var(--finance-positive)'}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default function MarketChart({
  data,
  currency,
}: {
  data: { price: number; date: number }[];
  currency: string | null;
}) {
  const gradient = 'market-fill-' + useId().replace(/:/g, '');
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 15, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-color)" stopOpacity={0.13} />
            <stop offset="100%" stopColor="var(--chart-color)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="3 5" />
        <XAxis
          dataKey="date"
          type="number"
          domain={['dataMin', 'dataMax']}
          minTickGap={45}
          tickMargin={14}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
          }
          tick={{ fill: 'var(--app-secondary)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          orientation="right"
          width={58}
          tickMargin={12}
          tick={{ fill: 'var(--app-tertiary)', fontSize: 10 }}
          tickFormatter={(value) => Number(value).toLocaleString()}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ stroke: 'var(--app-secondary)', strokeDasharray: '3 3' }}
          labelFormatter={(value) =>
            new Date(Number(value)).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })
          }
          formatter={(value) => [
            Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 }),
            currency || 'Price',
          ]}
          contentStyle={{
            background: 'var(--app-surface)',
            border: '1px solid var(--app-separator)',
            color: 'var(--app-text)',
            borderRadius: 10,
          }}
        />
        <Area
          dataKey="price"
          name={currency || 'Price'}
          type="monotone"
          stroke="var(--chart-color)"
          strokeWidth={2.2}
          fill={`url(#${gradient})`}
          animationDuration={400}
          activeDot={{
            r: 4,
            fill: 'var(--chart-color)',
            stroke: 'var(--app-surface)',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
