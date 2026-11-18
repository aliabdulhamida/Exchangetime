'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MetricValue = {
  label: string;
  value: number;
  unit: '%' | 'pp' | 'index' | 'usdT';
  date: string;
  series: string[];
};

type CountryMetrics = {
  gdp: MetricValue;
  interestRate: MetricValue;
  inflationYoY: MetricValue;
  unemploymentRate: MetricValue;
  tenYearYield: MetricValue;
  realInterestRate: MetricValue;
  yieldCurveSlope: MetricValue;
  inflationTargetGap: MetricValue;
  unemploymentChange12m: MetricValue;
  miseryIndex: MetricValue;
};

type CountrySnapshot = {
  code: string;
  name: string;
  metrics: CountryMetrics;
};

type EconomicIndicatorsPayload = {
  fetchedAt: string;
  source: 'FRED';
  countries: CountrySnapshot[];
  stale?: boolean;
  error?: string;
};

type LegacyMetricValue = {
  label: string;
  value: number;
  unit: '%' | 'index';
  date: string;
};

type LegacyPayload = {
  fetchedAt?: string;
  source?: string;
  stale?: boolean;
  error?: string;
  indicators?: {
    gdp?: LegacyMetricValue;
    interestRate?: LegacyMetricValue;
    inflationYoY?: LegacyMetricValue;
    unemploymentRate?: LegacyMetricValue;
    tenYearYield?: LegacyMetricValue;
    realInterestRate?: LegacyMetricValue;
    realPolicyRate?: LegacyMetricValue;
    miseryIndex?: LegacyMetricValue;
  };
};

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const LIVE_ENDPOINT = '/api/economic-indicators';
const SNAPSHOT_ENDPOINT = '/economic-indicators.json';

const METRIC_COLUMNS: Array<{
  key: keyof CountryMetrics;
  shortLabel: string;
}> = [
  { key: 'gdp', shortLabel: 'GDP ($T)' },
  { key: 'interestRate', shortLabel: 'Rate' },
  { key: 'inflationYoY', shortLabel: 'Infl.' },
  { key: 'unemploymentRate', shortLabel: 'Unemp.' },
  { key: 'tenYearYield', shortLabel: '10Y' },
  { key: 'realInterestRate', shortLabel: 'Real' },
  { key: 'yieldCurveSlope', shortLabel: 'Curve' },
  { key: 'inflationTargetGap', shortLabel: 'Infl. Gap' },
  { key: 'unemploymentChange12m', shortLabel: 'Unemp. 12M' },
  { key: 'miseryIndex', shortLabel: 'Misery' },
];

const HIGHER_WORSE_METRICS = new Set<keyof CountryMetrics>([
  'inflationYoY',
  'unemploymentRate',
  'inflationTargetGap',
  'unemploymentChange12m',
  'miseryIndex',
]);

function formatDate(value: string): string {
  if (!value) return 'Not reported';
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(parsed);
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function formatMetricValue(metric: MetricValue): string {
  if (!Number.isFinite(metric.value)) return '—';
  const absFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const signedFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  });

  if (metric.unit === '%') return `${absFormatter.format(metric.value)}%`;
  if (metric.unit === 'pp') return `${signedFormatter.format(metric.value)} pp`;
  if (metric.unit === 'usdT') return `${absFormatter.format(metric.value)}T`;
  return absFormatter.format(metric.value);
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function heatToneForMetric(
  metricKey: keyof CountryMetrics,
  value: number,
  min: number,
  max: number,
): { backgroundColor: string; valueClass: string } {
  if (!Number.isFinite(value)) return {backgroundColor: 'transparent', valueClass: 'text-muted-foreground'};
  const span = max - min;
  const t = span === 0 ? 0.5 : clamp01((value - min) / span);

  if (HIGHER_WORSE_METRICS.has(metricKey)) {
    const alpha = 0.08 + t * 0.26;
    return {
      backgroundColor: `rgba(239, 68, 68, ${alpha.toFixed(3)})`,
      valueClass: t > 0.62 ? 'text-rose-700 dark:text-rose-300' : 'text-foreground',
    };
  }

  if (min < 0 && max > 0) {
    if (value < 0) {
      const negT = clamp01(Math.abs(value / min));
      return {
        backgroundColor: `rgba(245, 158, 11, ${(0.08 + negT * 0.24).toFixed(3)})`,
        valueClass: negT > 0.62 ? 'text-amber-700 dark:text-amber-300' : 'text-foreground',
      };
    }
    const posT = clamp01(value / max);
    return {
      backgroundColor: `rgba(59, 130, 246, ${(0.08 + posT * 0.24).toFixed(3)})`,
      valueClass: posT > 0.62 ? 'text-blue-700 dark:text-blue-300' : 'text-foreground',
    };
  }

  const alpha = 0.08 + t * 0.24;
  return {
    backgroundColor: `rgba(59, 130, 246, ${alpha.toFixed(3)})`,
    valueClass: t > 0.62 ? 'text-blue-700 dark:text-blue-300' : 'text-foreground',
  };
}

function normalizePayload(payload: unknown): EconomicIndicatorsPayload | null {
  if (!payload || typeof payload !== 'object') return null;

  const maybeModern = payload as EconomicIndicatorsPayload;
  if (Array.isArray(maybeModern.countries) && maybeModern.countries.length > 0) {
    return {
      ...maybeModern,
      countries: maybeModern.countries.filter(country => country && typeof country.code === 'string' && typeof country.name === 'string').map((country) => {
        return {
          ...country,
          metrics: Object.fromEntries(METRIC_COLUMNS.map(column => {
            const metric = country.metrics?.[column.key];
            return [column.key, {
              label: typeof metric?.label === 'string' ? metric.label : column.shortLabel,
              value: toFiniteNumber(metric?.value) ?? NaN,
              unit: ['%', 'pp', 'index', 'usdT'].includes(metric?.unit) ? metric.unit : column.key === 'gdp' ? 'usdT' : '%',
              date: typeof metric?.date === 'string' ? metric.date : '',
              series: Array.isArray(metric?.series) ? metric.series.filter(value => typeof value === 'string') : [],
            }];
          })) as CountryMetrics,
        };
      }),
    };
  }

  const legacy = payload as LegacyPayload;
  const legacyIndicators = legacy.indicators;
  if (!legacyIndicators) return null;

  const gdpMetric = legacyIndicators.gdp;
  const interestRate = legacyIndicators.interestRate;
  const inflationYoY = legacyIndicators.inflationYoY;
  const unemploymentRate = legacyIndicators.unemploymentRate;
  const tenYearYield = legacyIndicators.tenYearYield;
  const realRateMetric = legacyIndicators.realInterestRate ?? legacyIndicators.realPolicyRate;
  const miseryMetric = legacyIndicators.miseryIndex;

  if (!interestRate || !inflationYoY || !unemploymentRate || !tenYearYield || !realRateMetric) {
    return null;
  }

  const gdpRawValue = toFiniteNumber(gdpMetric?.value);
  const gdpValue =
    gdpRawValue === null ? NaN : gdpRawValue > 1_000_000 ? gdpRawValue / 1_000_000_000_000 : gdpRawValue;
  const interestValue = toFiniteNumber(interestRate.value);
  const inflationValue = toFiniteNumber(inflationYoY.value);
  const unemploymentValue = toFiniteNumber(unemploymentRate.value);
  const tenYearValue = toFiniteNumber(tenYearYield.value);
  const realRateValue = toFiniteNumber(realRateMetric.value);
  const miseryValue =
    toFiniteNumber(miseryMetric?.value) ??
    (inflationValue !== null && unemploymentValue !== null
      ? inflationValue + unemploymentValue
      : null);

  if (
    interestValue === null ||
    inflationValue === null ||
    unemploymentValue === null ||
    tenYearValue === null ||
    realRateValue === null ||
    miseryValue === null
  ) {
    return null;
  }

  return {
    fetchedAt: legacy.fetchedAt ?? '',
    source: 'FRED',
    stale: legacy.stale,
    error: legacy.error,
    countries: [
      {
        code: 'US',
        name: 'United States',
        metrics: {
          gdp: {
            label: 'GDP (Current US$)',
            value: gdpValue,
            unit: 'usdT',
            date: gdpMetric?.date || interestRate.date || inflationYoY.date,
            series: [],
          },
          interestRate: {
            label: interestRate.label || 'Policy Rate (Fed Funds)',
            value: interestValue,
            unit: '%',
            date: interestRate.date || inflationYoY.date,
            series: [],
          },
          inflationYoY: {
            label: inflationYoY.label || 'Inflation (CPI YoY)',
            value: inflationValue,
            unit: '%',
            date: inflationYoY.date,
            series: [],
          },
          unemploymentRate: {
            label: unemploymentRate.label || 'Unemployment Rate',
            value: unemploymentValue,
            unit: '%',
            date: unemploymentRate.date,
            series: [],
          },
          tenYearYield: {
            label: tenYearYield.label || '10Y Government Yield',
            value: tenYearValue,
            unit: '%',
            date: tenYearYield.date,
            series: [],
          },
          realInterestRate: {
            label: realRateMetric.label || 'Real Interest Rate',
            value: realRateValue,
            unit: '%',
            date: realRateMetric.date || inflationYoY.date,
            series: [],
          },
          yieldCurveSlope: {
            label: 'Yield Curve Slope (10Y - Short)',
            value: tenYearValue - interestValue,
            unit: 'pp',
            date: tenYearYield.date,
            series: [],
          },
          inflationTargetGap: {
            label: 'Inflation Gap vs 2% Target',
            value: inflationValue - 2,
            unit: 'pp',
            date: inflationYoY.date,
            series: [],
          },
          unemploymentChange12m: {
            label: 'Unemployment Change (12M)',
            value: NaN,
            unit: 'pp',
            date: unemploymentRate.date,
            series: [],
          },
          miseryIndex: {
            label: miseryMetric?.label || 'Misery Index (Inflation + Unemployment)',
            value: miseryValue,
            unit: 'index',
            date: miseryMetric?.date || inflationYoY.date,
            series: [],
          },
        },
      },
    ],
  };
}

export default function EconomicIndicators() {
  const [data, setData] = useState<EconomicIndicatorsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [sortBy, setSortBy] = useState<keyof CountryMetrics>('gdp');
  const [ascending, setAscending] = useState(false);

  const fetchIndicators = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      let lastError: Error | null = null;

      for (const endpoint of [LIVE_ENDPOINT, SNAPSHOT_ENDPOINT]) {
        try {
          const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
          if (!response.ok) {
            throw new Error(`Failed to load macro data (${response.status})`);
          }

          const rawPayload = await response.json();
          const payload = normalizePayload(rawPayload);
          if (!payload || !Array.isArray(payload.countries) || payload.countries.length === 0) {
            throw new Error('Macro data payload is missing country snapshots');
          }

          setData(payload);
          if (payload.error) {
            setError(payload.error);
          } else if (endpoint === SNAPSHOT_ENDPOINT) {
            setError('Showing build snapshot because the live macro endpoint is unavailable.');
          }
          return;
        } catch (requestError) {
          lastError =
            requestError instanceof Error
              ? requestError
              : new Error('Unable to load economic indicators right now.');
        }
      }

      throw lastError ?? new Error('Unable to load economic indicators right now.');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load economic indicators right now.';
      setError(message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIndicators();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchIndicators({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchIndicators]);

  const matrixRows = useMemo(() => {
    if (!data) return [];
    const term = query.trim().toLowerCase();
    return data.countries.filter(country => (country.name + ' ' + country.code).toLowerCase().includes(term)).sort((a, b) => {
      const left = a.metrics[sortBy].value;
      const right = b.metrics[sortBy].value;
      if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : a.name.localeCompare(b.name);
      if (!Number.isFinite(right)) return -1;
      const difference = ascending ? left - right : right - left;
      if (difference !== 0) return difference;
      return a.name.localeCompare(b.name);
    });
  }, [data, query, sortBy, ascending]);
  const country = matrixRows.find(row => row.code === countryCode) ?? matrixRows[0];

  const metricRanges = useMemo(() => {
    const ranges: Record<keyof CountryMetrics, { min: number; max: number }> = {
      gdp: { min: 0, max: 0 },
      interestRate: { min: 0, max: 0 },
      inflationYoY: { min: 0, max: 0 },
      unemploymentRate: { min: 0, max: 0 },
      tenYearYield: { min: 0, max: 0 },
      realInterestRate: { min: 0, max: 0 },
      yieldCurveSlope: { min: 0, max: 0 },
      inflationTargetGap: { min: 0, max: 0 },
      unemploymentChange12m: { min: 0, max: 0 },
      miseryIndex: { min: 0, max: 0 },
    };

    METRIC_COLUMNS.forEach(({ key }) => {
      const values = (data?.countries ?? [])
        .map((row) => row.metrics[key].value)
        .filter((value) => Number.isFinite(value));
      if (values.length === 0) return;
      ranges[key] = { min: Math.min(...values), max: Math.max(...values) };
    });

    return ranges;
  }, [data]);

  const columnLabels = useMemo(() => {
    if (!data || data.countries.length === 0) return null;
    const sample = data.countries[0].metrics;
    return METRIC_COLUMNS.map((column) => ({
      ...column,
      fullLabel: sample[column.key].label,
    }));
  }, [data]);

  return (
    <div className="macro-workspace tool-surface flex h-full flex-col">
      <h2 className="text-lg font-semibold text-foreground">Economic Indicators Matrix</h2>

      {loading && !data ? (
        <div className="mt-4 rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground">
          Loading latest macro data...
        </div>
      ) : null}

      {error && !data ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {data && columnLabels ? (
        <>
          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="macro-controls">
            <label className="terminal-label">Find country<input type="search" className="terminal-input" value={query} placeholder="Country or code"
              onChange={event => setQuery(event.target.value)} /></label>
            <label className="terminal-label">Compare by<select className="terminal-input" value={sortBy} onChange={event => setSortBy(event.target.value as keyof CountryMetrics)}>
              {columnLabels.map(column => <option key={column.key} value={column.key}>{column.fullLabel}</option>)}</select></label>
            <button type="button" className="terminal-button" onClick={() => setAscending(value => !value)}
              aria-label={ascending ? 'Sort descending' : 'Sort ascending'}>{ascending ? '↑ Lowest first' : '↓ Highest first'}</button>
          </div>
          <p className="terminal-note mt-3" role="status">{matrixRows.length} countries{!matrixRows.length && ' · No matches'}</p>
          {country && <section className="macro-country-mobile md:hidden" aria-label="Country indicators">
            <label className="terminal-label">Country<select className="terminal-input" value={country.code}
              onChange={event => setCountryCode(event.target.value)}>
              {matrixRows.map(row => <option key={row.code} value={row.code}>{row.name}</option>)}
            </select></label>
            <dl>{columnLabels.map(column => {
              const metric = country.metrics[column.key];
              return <div key={column.key}><dt>{metric.label}</dt><dd>{formatMetricValue(metric)}</dd>
                <details><summary>{Number.isFinite(metric.value) ? 'As of ' + formatDate(metric.date) : 'Data unavailable'}</summary>
                  {metric.series.length ? metric.series.map(series => <a href={'https://fred.stlouisfed.org/series/' + encodeURIComponent(series)}
                    key={series} target="_blank" rel="noopener noreferrer">{series} ↗</a>) : <p>Source series not provided.</p>}
                </details></div>;
            })}</dl>
          </section>}
          <div className="macro-matrix hidden md:block mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="min-w-[980px] w-full border-collapse text-xs">
              <caption className="sr-only">Economic indicators by country. Observation dates vary by metric; missing values are shown as a dash.</caption>
              <thead>
                <tr className="border-b border-border/80 bg-muted/25">
                  <th scope="col" className="sticky left-0 z-10 w-[104px] min-w-[104px] max-w-[104px] sm:w-[128px] sm:min-w-[128px] sm:max-w-[128px] border-r border-border/80 bg-card px-2 py-2 text-left font-semibold text-foreground">
                    Country
                  </th>
                  {columnLabels.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="min-w-[90px] border-r border-border/60 px-2 py-2 text-center font-semibold text-foreground"
                      title={column.fullLabel}
                    >
                      {column.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((country) => (
                  <tr key={country.code} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="sticky left-0 z-10 w-[104px] min-w-[104px] max-w-[104px] sm:w-[128px] sm:min-w-[128px] sm:max-w-[128px] border-r border-border/80 bg-card px-2 py-2">
                      <div className="font-medium leading-tight text-foreground">{country.name}</div>
                      <div className="text-[11px] text-muted-foreground">{country.code}</div>
                    </td>
                    {columnLabels.map((column) => {
                      const metric = country.metrics[column.key];
                      const range = metricRanges[column.key];
                      const tone = heatToneForMetric(
                        column.key,
                        metric.value,
                        range.min,
                        range.max,
                      );
                      return (
                        <td
                          key={`${country.code}-${column.key}`}
                          className="border-r border-border/50 px-2 py-2 text-center"
                          title={`${metric.label} | As of ${formatDate(metric.date)}`}
                        >
                          <div
                            className="rounded-md px-1.5 py-1"
                            style={{ backgroundColor: tone.backgroundColor }}
                          >
                            <div className={`font-medium ${tone.valueClass}`}>
                              {formatMetricValue(metric)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatDate(metric.date)}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-start justify-between gap-3 text-[11px] text-muted-foreground">
            <p>
              Source: Federal Reserve Economic Data (FRED). Last fetched{' '}
              {Number.isFinite(Date.parse(data.fetchedAt)) ? new Intl.DateTimeFormat(undefined, {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(data.fetchedAt)) : 'Unavailable'}
              .
            </p>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground bg-blue-500/20">
                lower/mid
              </span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300 bg-rose-500/25">
                higher risk metrics
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchIndicators({ silent: true })}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-muted"
              disabled={isRefreshing}
              aria-label="Refresh economic indicators"
              title="Refresh economic indicators"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
