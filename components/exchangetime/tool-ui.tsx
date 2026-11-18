import React, { type ReactNode } from 'react';

import { localCalendarKey, parseCalendarDate } from '../../lib/calendar-view';

export function CalendarDateJump({date, onSelect}: {date: Date; onSelect: (date: Date) => void}) {
  return <div className="calendar-date-jump">
    <input type="date" className="terminal-input" aria-label="Go to calendar date" value={localCalendarKey(date)}
      onChange={event => {const next = parseCalendarDate(event.target.value); if (next) onSelect(next);}} />
    <button type="button" className="terminal-button" onClick={() => onSelect(new Date())}>Today</button>
  </div>;
}

export function ToolSegmented({ value, onChange, options, fullWidth = false, label = 'Options' }: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
  label?: string;
}) {
  return <div className={'tool-segmented-control' + (fullWidth ? ' is-full-width' : '')} role="group" aria-label={label}>
    {options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

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
