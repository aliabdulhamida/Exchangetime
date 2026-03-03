'use client';

import { ArrowLeftRight, AlertTriangle, ChevronDown } from 'lucide-react';
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
    <div className="rounded-xl px-6 pt-3 pb-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        Currency Converter
      </h2>
      <form className="space-y-4" onSubmit={handleConvert}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount
          </label>
          <Input
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
          />
        </div>
        <div className="flex items-end gap-3 sm:gap-4">
          <div className="mt-2 flex-1">
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
            size="sm"
            type="button"
            onClick={swapCurrencies}
            className="mb-[1px] bg-transparent"
            aria-label="Swap currencies"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </Button>
          <div className="mt-2 flex-1">
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
        <div className="mb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Common pairs:</p>
          <div className="flex flex-wrap gap-2">
            {commonPairs.map(([from, to]) => (
              <Button
                key={from + to}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setFromCurrency(from);
                  setToCurrency(to);
                  setResult(null);
                  setRate(null);
                  setError(null);
                }}
              >
                {from}/{to}
              </Button>
            ))}
          </div>
        </div>
        <Button
          type="submit"
          className="w-full flex items-center justify-center gap-2"
          disabled={loading}
        >
          <i className="bi bi-arrow-repeat text-lg" />
          {loading ? 'Loading...' : 'Convert'}
        </Button>
      </form>
      {error && (
        <Alert
          variant="destructive"
          className="mt-4 border-red-400 bg-red-100/60 dark:bg-red-900/30 text-red-700 dark:text-red-300 border flex flex-col items-center justify-center text-center relative py-8 px-4"
        >
          <AlertTriangle className="w-8 h-8 mb-2 text-red-600 dark:text-red-200" />
          <div className="text-lg mb-1 mx-auto max-w-xs break-words">{error}</div>
        </Alert>
      )}
      {result !== null && rate !== null && (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#1F1F23] text-center mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Result</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(result, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            {toCurrency}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            1 {fromCurrency} ={' '}
            {formatNumber(rate, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}{' '}
            {toCurrency}
          </p>
          <p className="text-xs text-gray-400 mt-1">Last updated: {lastUpdated}</p>
        </div>
      )}
    </div>
  );
}
