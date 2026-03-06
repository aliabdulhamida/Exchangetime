'use client';

import { ArrowLeftRight, AlertTriangle, ChevronDown, Clock3 } from 'lucide-react';
// import { SiConvertio } from "react-icons/si"
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [amount, setAmount] = useState('1,000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  // Helper: US-Format mit Tausendertrennzeichen
  const formatNumber = (value: number, opts: Intl.NumberFormatOptions = {}) =>
    new Intl.NumberFormat('en-US', opts).format(value);

  const handleConvert = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setRate(null);
    try {
      // Kommas entfernen, dann parsen
      const amt = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(amt) || amt <= 0) throw new Error('Please enter a valid positive amount');
      if (fromCurrency === toCurrency)
        throw new Error('Please select different currencies for conversion');
      const symbol = `${fromCurrency}${toCurrency}=X`;
      const url = `/api/quote?symbol=${encodeURIComponent(symbol)}&chart=1&range=5d&interval=1d`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.chart && data.chart.result && data.chart.result[0]) {
        const rateVal = data.chart.result[0].meta.regularMarketPrice as number;
        setRate(rateVal);
        setResult(amt * rateVal);
        setLastUpdated(new Date().toLocaleString());
      } else {
        throw new Error('Exchange rate not available');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
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
    <div className="rounded-xl px-3 pb-5 pt-2 sm:px-4 sm:pb-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">Currency Converter</h2>
      </div>

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
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                // Nur Ziffern, Komma und Punkt erlauben
                const raw = e.target.value.replace(/[^0-9.,]/g, '');
                setAmount(raw);
              }}
              onBlur={() => {
                const num = parseFloat(amount.replace(/,/g, ''));
                if (!isNaN(num)) {
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
              className="h-12 rounded-xl border-border/70 bg-background/70 px-4 pr-16 text-lg font-semibold tracking-tight sm:text-xl"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {fromCurrency}
            </div>
          </div>
        </div>

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

      {result !== null && rate !== null && (
        <div className="mt-4 rounded-xl border border-border/70 bg-gradient-to-b from-card/80 via-card/55 to-card/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Conversion Result
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {formatNumber(result, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            {toCurrency}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
      )}
    </div>
  );
}
