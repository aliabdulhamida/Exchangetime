'use client';

import React from 'react';

type Entry = { name?: string | number; value?: unknown; color?: string };

export default function FinancialTooltip({
  active,
  payload,
  label,
  labelFormatter,
  formatValue,
}: {
  active?: boolean;
  payload?: readonly Entry[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  formatValue?: (value: number, name: string) => string;
}) {
  const entries =
    payload?.filter((entry) => typeof entry.value === 'number' && Number.isFinite(entry.value)) ||
    [];
  if (!active || !entries.length) return null;
  return (
    <div className="financial-chart-tooltip">
      {label !== undefined && <p>{labelFormatter ? labelFormatter(label) : label}</p>}
      <dl>
        {entries.map((entry, index) => {
          const name = String(entry.name ?? 'Value');
          const value = entry.value as number;
          return (
            <div key={name + index}>
              <dt>
                <span
                  style={{ backgroundColor: entry.color || 'var(--chart-color)' }}
                  aria-hidden
                />
                {name}
              </dt>
              <dd>
                {formatValue
                  ? formatValue(value, name)
                  : value.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
