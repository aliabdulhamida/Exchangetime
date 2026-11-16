import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';

import { CalendarWeekStrip, ToolEmptyState } from '../components/exchangetime/tool-ui';

it('renders seven clearly named dates with a single selected date', () => {
  const dates = Array.from({ length: 7 }, (_, index) => new Date(2026, 10, 16 + index, 12));
  const html = renderToStaticMarkup(
    createElement(CalendarWeekStrip, { dates, selected: 3, onSelect: () => {} }),
  );
  expect(html.match(/<button/g)).toHaveLength(7);
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(html).toContain('Thursday, 19 November 2026');
});

it('shows explanatory empty states instead of fabricated values', () => {
  const html = renderToStaticMarkup(
    createElement(ToolEmptyState, {
      icon: null,
      title: 'No transactions',
      description: 'Add a real broker transaction to begin.',
    }),
  );
  expect(html).toContain('No transactions');
  expect(html).toContain('Add a real broker transaction');
});
