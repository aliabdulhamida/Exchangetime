import { AlertTriangle, Clock3, Database, type LucideIcon } from 'lucide-react';
import React from 'react';

type DataFreshnessProps = {
  source: string;
  updatedAt?: Date | string | number | null;
  frequency?: string;
  delay?: string;
  estimated?: boolean;
  compact?: boolean;
  className?: string;
  stale?: boolean;
};

function formatUpdatedAt(updatedAt: DataFreshnessProps['updatedAt']) {
  if (!updatedAt) return 'Update pending';
  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return 'Update pending';
  return `Observed ${date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
}

export default function DataFreshness({
  source,
  updatedAt,
  frequency,
  delay,
  estimated,
  compact,
  className,
  stale,
}: DataFreshnessProps) {
  const items = [
    updatedAt ? { icon: Clock3, label: formatUpdatedAt(updatedAt) } : null,
    { icon: Database, label: `Source: ${source}` },
    frequency ? { icon: Clock3, label: `Frequency: ${frequency}` } : null,
    delay ? { icon: Clock3, label: delay } : null,
    estimated ? { icon: AlertTriangle, label: 'Contains estimated or model-derived values' } : null,
  ].filter(Boolean) as Array<{ icon: LucideIcon; label: string }>;

  return (
    <div
      className={['data-status', compact && 'data-status-compact', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="data-status-observation">
        <Clock3 size={12} aria-hidden />
        {formatUpdatedAt(updatedAt)}
      </span>
      {stale && (
        <span role="status" className="data-status-warning">
          <AlertTriangle size={12} aria-hidden />
          Stale data
        </span>
      )}
      {estimated && <span>Model estimate</span>}
      <details className="data-details">
        <summary>Data details</summary>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <span
              key={item.label}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-secondary/40 px-2 py-1"
            >
              <Icon className="h-3 w-3" />
              {item.label}
            </span>
          );
        })}
      </details>
    </div>
  );
}
