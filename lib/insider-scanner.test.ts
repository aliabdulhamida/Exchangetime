import { describe, expect, it } from 'vitest';

import {
  defaultInsiderFilters,
  filterInsiderTrades,
  normalizeInsiderTrade,
  reportedPurchase,
  reportedSale,
} from './insider-scanner';

const purchase = {
  formType: '4',
  transactionType: 'P-Purchase',
  symbol: 'TEST',
  filingDate: '2026-02-05',
  transactionDate: '2026-02-03',
  price: 12.5,
  securitiesTransacted: 100,
  reportingName: 'Test Person',
  typeOfOwner: 'officer: CFO, director',
  url: 'https://www.sec.gov/Archives/edgar/data/1/report.xml',
};
const now = Date.UTC(2026, 1, 9, 23);
const trade = normalizeInsiderTrade(purchase)!;

describe('Form 4 scanner', () => {
  it('includes coded purchases, sales, and amendments, not other forms or compensation', () => {
    expect(trade).toMatchObject({ side: 'buy', value: 1250, filingUrl: purchase.url });
    expect(
      normalizeInsiderTrade({ ...purchase, formType: '4/A', transactionType: 'S-Sale' }),
    ).toMatchObject({ side: 'sell', amended: true });
    for (const kind of ['M-Exercise', 'F-InKind', 'G-Gift', 'A-Award', 'D-Disposition', '']) {
      expect(
        normalizeInsiderTrade({
          ...purchase,
          transactionType: kind,
          acquisitionOrDisposition: 'A',
        }),
      ).toBeNull();
    }
    expect(normalizeInsiderTrade({ ...purchase, formType: '3' })).toBeNull();
  });
  it('does not turn a missing, negative, or non-finite price into a reported zero', () => {
    for (const price of [null, undefined, -1, NaN, Infinity, '']) {
      const row = normalizeInsiderTrade({ ...purchase, price })!;
      expect(row.price).toBeNull();
      expect(row.value).toBeNull();
      expect(filterInsiderTrades([row], { ...defaultInsiderFilters, minimumValue: '0' })).toEqual(
        [],
      );
    }
    expect(normalizeInsiderTrade({ ...purchase, price: 0 })?.value).toBe(0);
    expect(normalizeInsiderTrade({ ...purchase, securitiesTransacted: null })?.value).toBeNull();
  });
  it('filters cumulatively by direction, person, role, inclusive size and UTC trade date', () => {
    const rules = {
      side: 'buy',
      person: 'pErSoN',
      role: 'director',
      minimumValue: '1250',
      days: 7,
    } as const;
    expect(filterInsiderTrades([trade], rules, now)).toEqual([trade]);
    expect(filterInsiderTrades([trade], { ...rules, side: 'sell' }, now)).toEqual([]);
    expect(filterInsiderTrades([trade], { ...rules, role: 'owner' }, now)).toEqual([]);
    expect(filterInsiderTrades([trade], { ...rules, minimumValue: '1251' }, now)).toEqual([]);
    expect(filterInsiderTrades([{ ...trade, traded: '2026-02-02' }], rules, now)).toEqual([]);
    expect(filterInsiderTrades([{ ...trade, traded: null }], rules, now)).toEqual([]);
  });
  it('rejects malformed filing dates and untrusted filing links', () => {
    expect(normalizeInsiderTrade({ ...purchase, filingDate: '2026-02-30' })).toBeNull();
    expect(
      normalizeInsiderTrade({ ...purchase, url: 'https://evil.example/Archives/edgar/data/1' })
        ?.filingUrl,
    ).toBeNull();
  });
  it('does not classify a gift or option exercise as a buy in company research', () => {
    expect(reportedPurchase.test('Purchase at price 10 per share.')).toBe(true);
    expect(reportedSale.test('Sale at price 10 per share.')).toBe(true);
    for (const text of [
      'Gift',
      'Award',
      'Option Exercise',
      'Acquisition (Non Open Market)',
      'Disposition to issuer',
    ]) {
      expect(reportedPurchase.test(text) || reportedSale.test(text)).toBe(false);
    }
  });
});
