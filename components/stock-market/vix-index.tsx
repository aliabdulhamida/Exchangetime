'use client';

import { useEffect, useRef, useState } from 'react';

const INTERNAL_VIX_QUOTE_URL =
  '/api/quote?symbol=%5EVIX&chart=1&range=5d&interval=1d&includePrePost=false';
const PUBLIC_VIX_QUOTE_URL = 'https://api2.mmeter.app/data/public/vix';
const REQUEST_TIMEOUT_MS = 12000;
const SKIP_INTERNAL_VIX_API_SESSION_KEY = 'vix_skip_internal_api';

type FetchError = Error & { status?: number };

function toFiniteNumber(value: unknown): number | null {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(numericValue) ? numericValue : null;
}

function parseInternalVixPair(payload: unknown): { latest: number; previous: number } | null {
  if (!payload || typeof payload !== 'object') return null;

  const data = payload as {
    chart?: {
      result?: Array<{
        indicators?: {
          quote?: Array<{ close?: Array<number | null> }>;
        };
      }>;
    };
    series?: Array<number | null>;
  };

  const chartCloses = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
  const raw = Array.isArray(chartCloses) ? chartCloses : data.series;
  if (!Array.isArray(raw)) return null;

  const closes = raw.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (closes.length < 2) return null;

  return {
    latest: closes[closes.length - 1],
    previous: closes[closes.length - 2],
  };
}

function parsePublicVixPair(payload: unknown): { latest: number; previous: number } | null {
  if (!payload || typeof payload !== 'object') return null;

  const data = payload as {
    quote?: Array<{ price?: unknown; previousClose?: unknown }>;
    historical?: Array<{ price?: unknown }>;
  };

  const quoteLatest = toFiniteNumber(data.quote?.[0]?.price);
  const quotePrevious = toFiniteNumber(data.quote?.[0]?.previousClose);
  if (quoteLatest !== null && quotePrevious !== null && quotePrevious !== 0) {
    return { latest: quoteLatest, previous: quotePrevious };
  }

  const historicalPrices = (data.historical || [])
    .map((entry) => toFiniteNumber(entry?.price))
    .filter((value): value is number => value !== null);
  if (historicalPrices.length < 2) return null;

  return {
    latest: historicalPrices[0],
    previous: historicalPrices[1],
  };
}

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      const error = new Error(`API error: ${response.status}`) as FetchError;
      error.status = response.status;
      throw error;
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function VixIndex() {
  const [value, setValue] = useState<number | null>(null);
  const [changePct, setChangePct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const skipInternalApiRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(SKIP_INTERNAL_VIX_API_SESSION_KEY) === '1') {
      skipInternalApiRef.current = true;
    }

    const fetchVix = async () => {
      setLoading(true);
      try {
        let pair: { latest: number; previous: number } | null = null;

        if (!skipInternalApiRef.current) {
          try {
            const payload = await fetchJsonWithTimeout(INTERNAL_VIX_QUOTE_URL);
            pair = parseInternalVixPair(payload);
          } catch (err) {
            const fetchError = err as FetchError;
            if (fetchError.status === 404 || fetchError.status === 405 || fetchError.status === 503) {
              skipInternalApiRef.current = true;
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(SKIP_INTERNAL_VIX_API_SESSION_KEY, '1');
              }
            }
          }
        }

        if (!pair) {
          const publicPayload = await fetchJsonWithTimeout(PUBLIC_VIX_QUOTE_URL);
          pair = parsePublicVixPair(publicPayload);
        }

        if (!pair) {
          throw new Error('Not enough VIX data points');
        }

        const pct = pair.previous !== 0 ? ((pair.latest - pair.previous) / pair.previous) * 100 : 0;

        setValue(pair.latest);
        setChangePct(pct);
      } catch {
        setValue(null);
        setChangePct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVix();
    const interval = setInterval(fetchVix, 60000);
    return () => clearInterval(interval);
  }, []);

  const isRiskOff = typeof changePct === 'number' && changePct > 0;
  const changeLabel =
    typeof changePct === 'number'
      ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
      : loading
        ? 'Loading...'
        : 'N/A';

  return (
    <div className="flex items-center gap-1 sm:gap-2 px-1 py-0.5 sm:px-2 sm:py-1 rounded">
      <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground">VIX</span>
      <span className="font-bold text-[10px] sm:text-xs text-foreground">
        {typeof value === 'number' ? value.toFixed(2) : '-'}
      </span>
      <span
        className={`text-[9px] sm:text-[10px] font-medium ${
          typeof changePct !== 'number'
            ? 'text-muted-foreground'
            : isRiskOff
              ? 'text-red-500'
              : 'text-green-500'
        }`}
      >
        {changeLabel}
      </span>
    </div>
  );
}
