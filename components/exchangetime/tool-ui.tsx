import React, { type ReactNode } from 'react';

export function ToolSurface({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={'tool-surface ' + className}>{children}</section>;
}

export function ToolEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="tool-empty-state">
      <span className="tool-empty-icon" aria-hidden>
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="tool-empty-action">{action}</div>}
    </div>
  );
}

export function CalendarWeekStrip({
  dates,
  selected,
  onSelect,
}: {
  dates: Date[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="calendar-week-strip" role="group" aria-label="Select calendar date">
      {dates.map((date, index) => (
        <button
          type="button"
          key={date.toISOString()}
          aria-pressed={selected === index}
          aria-label={date.toLocaleDateString('en-GB', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          onClick={() => onSelect(index)}
        >
          <span>{date.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
          <strong>{date.getDate()}</strong>
        </button>
      ))}
    </div>
  );
}
