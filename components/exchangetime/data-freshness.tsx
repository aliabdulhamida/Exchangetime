import { AlertTriangle, Clock3, Database, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type DataFreshnessProps = {
  source: string;
  updatedAt?: Date | string | number | null;
  frequency?: string;
  delay?: string;
  estimated?: boolean;
  compact?: boolean;
  className?: string;
};

function formatUpdatedAt(updatedAt: DataFreshnessProps['updatedAt']) {
  if (!updatedAt) return 'Update pending';
  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return 'Update pending';
  return `Updated ${date.toLocaleTimeString([], {
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
      className={cn(
        'flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground',
        compact && 'gap-1.5 text-[10px]',
        className,
      )}
    >
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
    </div>
  );
}
