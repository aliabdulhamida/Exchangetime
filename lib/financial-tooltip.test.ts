import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';

import FinancialTooltip from '../components/exchangetime/financial-tooltip';

it('shows dates, names and all valid series values', () => {
  const html = renderToStaticMarkup(
    createElement(FinancialTooltip, {
      active: true,
      label: '2026-11-17',
      payload: [
        { name: 'Portfolio', value: 102.5 },
        { name: 'Benchmark', value: 101 },
      ],
      formatValue: (value) => value.toFixed(2),
    }),
  );
  expect(html).toContain('2026-11-17');
  expect(html).toContain('Portfolio');
  expect(html).toContain('Benchmark');
  expect(html).toContain('102.50');
  expect(html).toContain('101.00');
});
it('never turns missing or non-finite values into zero', () => {
  expect(
    renderToStaticMarkup(
      createElement(FinancialTooltip, {
        active: true,
        payload: [{ value: null }, { value: NaN }, { value: Infinity }],
      }),
    ),
  ).toBe('');
  expect(
    renderToStaticMarkup(
      createElement(FinancialTooltip, { active: false, payload: [{ value: 1 }] }),
    ),
  ).toBe('');
});
