'use client';

import { ArrowLeftRight, AlertTriangle, ChevronDown } from 'lucide-react';
// import { SiConvertio } from "react-icons/si"
import { useEffect, useRef, useState } from 'react';

import DataFreshness from '@/components/exchangetime/data-freshness';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { conversionValue, parseConversionAmount } from '@/lib/currency-conversion';

const currencies = [
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'NZD',
  'INR',
  'SGD',
  'HKD',
  'SEK',
  'KRW',
  'MXN',
  'BRL',
  'RUB',
  'ZAR',
  'TRY',
  'NOK',
  'DKK',
  'PLN',
  'THB',
  'IDR',
  'AED',
  'SAR',
  'ILS',
  'PHP',
  'MYR',
  'CZK',
  'TND',
  'BHD',
  'KWD',
  'LYD',
  'JOD',
  'IQD',
];

const commonPairs = [
  ['EUR', 'USD'],
  ['USD', 'JPY'],
  ['GBP', 'USD'],
  ['USD', 'CHF'],
  ['EUR', 'GBP'],
  ['AUD', 'USD'],
];

export default function CurrencyConverter() {
  // Eingabewert als Text, damit wir Kommas/Darstellung steuern können
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | undefined>();
  const [resultFor, setResultFor] = useState('');
  const parsedAmount = parseConversionAmount(amount);
  const selection = [parsedAmount, fromCurrency, toCurrency].join('|');
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setError(null);
    return () => { request.current?.abort(); request.current = null; };
  }, [selection]);
  // Helper: US-Format mit Tausendertrennzeichen
  const formatNumber = (value: number, opts: Intl.NumberFormatOptions = {}) =>
    new Intl.NumberFormat('en-US', opts).format(value);

  const handleConvert = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setLoading(true);
    setError(null);
    try {
      // Kommas entfernen, dann parsen
      const amt = parseConversionAmount(amount);
      if (amt === null) throw new Error('Enter a positive amount up to 1,000,000,000,000,000. Use a dot for decimals and groups of three digits after commas.');
      if (fromCurrency === toCurrency)
        throw new Error('Please select different currencies for conversion');
      const symbol = `${fromCurrency}${toCurrency}=X`;
      const url = `/api/quote?symbol=${encodeURIComponent(symbol)}&chart=1&range=5d&interval=1d`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Exchange rate source unavailable. Please retry.');
      const data = await response.json();
      if (request.current !== controller) return;
      if (data.chart && data.chart.result && data.chart.result[0]) {
        const meta = data.chart.result[0]?.meta;
        const rateVal = meta?.regularMarketPrice;
        if (typeof rateVal !== 'number' || !Number.isFinite(rateVal) || rateVal <= 0) throw new Error('No valid exchange rate was reported.');
        const converted = conversionValue(amt, rateVal);
        if (converted === null) throw new Error('The converted amount is outside the supported range.');
        setResultFor(selection);
        setRate(rateVal);
        setResult(converted);
        setLastUpdated(typeof meta.regularMarketTime === 'number' && meta.regularMarketTime > 0 ? meta.regularMarketTime * 1000 : undefined);
      } else {
        throw new Error('Exchange rate not available');
      }
    } catch (err: any) {
      if (request.current === controller) setError(controller.signal.aborted ? 'The rate request timed out. Please retry.' : err.message || 'Exchange rate unavailable');
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
    setRate(null);
    setError(null);
  };

  return (
    <div className="currency-workspace rounded-xl px-3 pb-5 pt-2 sm:px-4 sm:pb-6">

      <form className="space-y-3.5" onSubmit={handleConvert}>
        <div className="rounded-xl border border-border/70 bg-gradient-to-b from-card/70 via-card/40 to-card/20 p-3.5">
          <label
            htmlFor="currency-amount"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Amount
          </label>
          <div className="relative mt-2">
            <Input
              id="currency-amount"
              data-number-format="grouped"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                // Nur Ziffern, Komma und Punkt erlauben
                const raw = e.target.value.replace(/[^0-9.,]/g, '');
                setAmount(raw);
              }}
              onBlur={() => {
                const num = parseConversionAmount(amount);
                if (num !== null) {
                  // Bei Verlassen formatieren (max 8 Nachkommastellen beibehalten)
                  const decimals = (() => {
                    const m = amount.replace(/,/g, '').match(/\.(\d+)/);
                    return m ? Math.min(m[1].length, 8) : 0;
                  })();
                  setAmount(
                    formatNumber(num, {
                      minimumFractionDigits: decimals,
                      maximumFractionDigits: decimals,
                    }),
                  );
                }
              }}
              placeholder="Enter amount"
              aria-describedby="currency-number-format"
              className="h-12 rounded-xl border-border/70 bg-background/70 px-4 pr-16 text-lg font-semibold tracking-tight sm:text-xl"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {fromCurrency}
            </div>
          </div>
        </div>
        <p id="currency-number-format" className="terminal-note">Number format: 1,234.56</p>

        <div className="rounded-xl border border-border/70 bg-card/30 p-3.5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5 sm:gap-3.5">
            <div className="min-w-0">
              <label
                htmlFor="from-currency"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                From
              </label>
              <div className="relative">
                <select
                  id="from-currency"
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="et-tool-select"
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                <ChevronDown className="et-tool-select-caret h-4 w-4" />
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={swapCurrencies}
              className="mb-0.5 h-10 w-10 rounded-xl border-border/70 bg-background/70 text-foreground hover:bg-muted/60"
              aria-label="Swap currencies"
            >
              <ArrowLeftRight className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <label
                htmlFor="to-currency"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                To
              </label>
              <div className="relative">
                <select
                  id="to-currency"
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="et-tool-select"
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                <ChevronDown className="et-tool-select-caret h-4 w-4" />
              </div>
            </div>
          </div>

        </div>

        <div className="rounded-xl border border-border/70 bg-card/20 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Common Pairs
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {commonPairs.map(([from, to]) => {
              const active = fromCurrency === from && toCurrency === to;
              return (
                <button
                  key={from + to}
                  aria-pressed={active}
                  type="button"
                  onClick={() => {
                    setFromCurrency(from);
                    setToCurrency(to);
                    setResult(null);
                    setRate(null);
                    setError(null);
                  }}
                  className={`rounded-lg border px-2.5 py-2 text-sm font-semibold transition ${
                    active
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                      : 'border-border/70 bg-background/50 text-foreground hover:border-border hover:bg-muted/50'
                  }`}
                >
                  {from}/{to}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl border border-border/70 bg-gradient-to-r from-primary/85 via-primary to-primary/85 text-primary-foreground shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:from-primary hover:via-primary hover:to-primary"
          disabled={loading}
        >
          <ArrowLeftRight className="h-4 w-4" />
          {loading ? 'Loading...' : 'Convert'}
        </Button>
      </form>

      {error && (
        <Alert
          variant="destructive"
          className="mt-4 flex flex-col items-center justify-center border border-red-400/50 bg-red-900/20 px-4 py-6 text-center text-red-200"
        >
          <AlertTriangle className="mb-2 h-7 w-7 text-red-300" />
          <div className="mx-auto max-w-xs break-words text-sm">{error}</div>
        </Alert>
      )}

      {result !== null && rate !== null && selection === resultFor && (
        <div className="currency-result mt-4 rounded-xl border border-border/70 bg-gradient-to-b from-card/80 via-card/55 to-card/35 p-4" aria-live="polite">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Conversion Result
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {formatNumber(result, { style: 'currency', currency: toCurrency })}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>1 {fromCurrency} = {formatNumber(rate, { maximumSignificantDigits: 8 })} {toCurrency}<br />
              1 {toCurrency} = {formatNumber(1 / rate, { maximumSignificantDigits: 8 })} {fromCurrency}</span>
          </div>
          <DataFreshness source="Yahoo Finance" updatedAt={lastUpdated} delay="May be delayed" stale={Boolean(error)} />
          <details className="data-details"><summary>Rate assumptions</summary><p>Indicative market rate only. Bank spreads, transfer fees and card charges are not included.</p></details>
        </div>
      )}
    </div>
  );
}
