import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;
const REQUEST_RETRY_DELAYS_MS = [350, 850];
const SNAPSHOT_FILE = path.join(process.cwd(), 'public', 'economic-indicators.json');
const FRED_HEADERS = {
  Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
  // FRED's edge occasionally times out generic runtime clients; browser-like headers improve reliability.
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

type SeriesPoint = {
  date: string;
  value: number;
};

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

type IndicatorsResponse = {
  fetchedAt: string;
  source: 'FRED';
  countries: CountrySnapshot[];
};

type CachedIndicators = {
  payload: unknown;
  cachedAt: number;
};

type CountryConfig = {
  code: string;
  name: string;
  gdpSeries: string;
  interestRateSeries: string;
  interestRateLabel: string;
  cpiSeries: string;
  unemploymentSeries: string;
  tenYearYieldSeries: string;
};

const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    code: 'US',
    name: 'United States',
    gdpSeries: 'MKTGDPUSA646NWDB',
    interestRateSeries: 'FEDFUNDS',
    interestRateLabel: 'Policy Rate (Fed Funds)',
    cpiSeries: 'CPIAUCSL',
    unemploymentSeries: 'UNRATE',
    tenYearYieldSeries: 'DGS10',
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    gdpSeries: 'MKTGDPGBA646NWDB',
    interestRateSeries: 'IR3TIB01GBM156N',
    interestRateLabel: 'Short-Term Rate (3M)',
    cpiSeries: 'GBRCPIALLMINMEI',
    unemploymentSeries: 'LRHUTTTTGBM156S',
    tenYearYieldSeries: 'IRLTLT01GBM156N',
  },
  {
    code: 'CA',
    name: 'Canada',
    gdpSeries: 'MKTGDPCAA646NWDB',
    interestRateSeries: 'IR3TIB01CAM156N',
    interestRateLabel: 'Short-Term Rate (3M)',
    cpiSeries: 'CANCPIALLMINMEI',
    unemploymentSeries: 'LRHUTTTTCAM156S',
    tenYearYieldSeries: 'IRLTLT01CAM156N',
  },
  {
    code: 'DE',
    name: 'Germany',
    gdpSeries: 'MKTGDPDEA646NWDB',
    interestRateSeries: 'IR3TIB01DEM156N',
    interestRateLabel: 'Short-Term Rate (3M)',
    cpiSeries: 'DEUCPIALLMINMEI',
    unemploymentSeries: 'LRHUTTTTDEM156S',
    tenYearYieldSeries: 'IRLTLT01DEM156N',
  },
  {
    code: 'FR',
    name: 'France',
    gdpSeries: 'MKTGDPFRA646NWDB',
    interestRateSeries: 'IR3TIB01FRM156N',
    interestRateLabel: 'Short-Term Rate (3M)',
    cpiSeries: 'FRACPIALLMINMEI',
    unemploymentSeries: 'LRHUTTTTFRM156S',
    tenYearYieldSeries: 'IRLTLT01FRM156N',
  },
  {
    code: 'IT',
    name: 'Italy',
    gdpSeries: 'MKTGDPITA646NWDB',
    interestRateSeries: 'IR3TIB01ITM156N',
    interestRateLabel: 'Short-Term Rate (3M)',
    cpiSeries: 'ITACPIALLMINMEI',
    unemploymentSeries: 'LRHUTTTTITQ156N',
    tenYearYieldSeries: 'IRLTLT01ITM156N',
  },
  {
    code: 'JP',
    name: 'Japan',
    gdpSeries: 'MKTGDPJPA646NWDB',
    interestRateSeries: 'IR3TIB01JPM156N',
    interestRateLabel: 'Short-Term Rate (3M)',
    cpiSeries: 'JPNCPIALLMINMEI',
    unemploymentSeries: 'LRHUTTTTJPM156S',
    tenYearYieldSeries: 'IRLTLT01JPM156N',
  },
];

const globalIndicatorsCache = globalThis as typeof globalThis & {
  __economicIndicatorsCache?: CachedIndicators;
};

function isIndicatorsResponse(payload: unknown): payload is IndicatorsResponse {
  if (!payload || typeof payload !== 'object') return false;
  const maybePayload = payload as {
    countries?: Array<{
      metrics?: {
        gdp?: { value?: unknown };
      };
    }>;
  };
  if (!Array.isArray(maybePayload.countries) || maybePayload.countries.length === 0) {
    return false;
  }
  const firstCountry = maybePayload.countries[0];
  const gdpValue = firstCountry?.metrics?.gdp?.value;
  if (!Number.isFinite(typeof gdpValue === 'number' ? gdpValue : Number(gdpValue))) {
    return false;
  }
  return true;
}

async function loadSnapshot(): Promise<IndicatorsResponse | null> {
  try {
    const raw = await readFile(SNAPSHOT_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return isIndicatorsResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function csvUrl(seriesId: string, startDate: string): string {
  const params = new URLSearchParams({
    id: seriesId,
    cosd: startDate,
  });
  return `https://fred.stlouisfed.org/graph/fredgraph.csv?${params.toString()}`;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseCsvSeries(csv: string): SeriesPoint[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return [];
  }

  const points: SeriesPoint[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const [rawDate, rawValue] = lines[i].split(',');
    const date = (rawDate ?? '').trim();
    const value = Number.parseFloat((rawValue ?? '').trim());

    if (!isIsoDate(date) || !Number.isFinite(value)) {
      continue;
    }

    points.push({ date, value });
  }

  return points;
}

function parseDateToUtcMs(value: string): number {
  return Date.parse(`${value}T00:00:00.000Z`);
}

function monthsAgo(date: string, monthDelta: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCMonth(base.getUTCMonth() - monthDelta);
  return formatDate(base);
}

function latestPoint(series: SeriesPoint[], seriesId: string): SeriesPoint {
  if (series.length === 0) {
    throw new Error(`No observations available for ${seriesId}`);
  }
  return series[series.length - 1];
}

function findPointAtOrBefore(series: SeriesPoint[], date: string): SeriesPoint | null {
  const targetMs = parseDateToUtcMs(date);
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const pointMs = parseDateToUtcMs(series[i].date);
    if (Number.isFinite(pointMs) && pointMs <= targetMs) {
      return series[i];
    }
  }
  return null;
}

function getSeriesOrThrow(seriesMap: Map<string, SeriesPoint[]>, seriesId: string): SeriesPoint[] {
  const series = seriesMap.get(seriesId);
  if (!series || series.length === 0) {
    throw new Error(`Series ${seriesId} is unavailable`);
  }
  return series;
}

function buildCountrySnapshot(
  config: CountryConfig,
  seriesMap: Map<string, SeriesPoint[]>,
): CountrySnapshot {
  const gdpSeries = getSeriesOrThrow(seriesMap, config.gdpSeries);
  const interestSeries = getSeriesOrThrow(seriesMap, config.interestRateSeries);
  const cpiSeries = getSeriesOrThrow(seriesMap, config.cpiSeries);
  const unemploymentSeries = getSeriesOrThrow(seriesMap, config.unemploymentSeries);
  const tenYearSeries = getSeriesOrThrow(seriesMap, config.tenYearYieldSeries);

  const latestGdp = latestPoint(gdpSeries, config.gdpSeries);
  const latestInterest = latestPoint(interestSeries, config.interestRateSeries);
  const latestCpi = latestPoint(cpiSeries, config.cpiSeries);
  const latestUnemployment = latestPoint(unemploymentSeries, config.unemploymentSeries);
  const latestTenYearYield = latestPoint(tenYearSeries, config.tenYearYieldSeries);

  const cpiRef =
    findPointAtOrBefore(cpiSeries, monthsAgo(latestCpi.date, 12)) ??
    findPointAtOrBefore(cpiSeries, monthsAgo(latestCpi.date, 13));
  if (!cpiRef) {
    throw new Error(`Not enough CPI history for ${config.code}`);
  }

  const unemploymentRef =
    findPointAtOrBefore(unemploymentSeries, monthsAgo(latestUnemployment.date, 12)) ??
    findPointAtOrBefore(unemploymentSeries, monthsAgo(latestUnemployment.date, 13));
  if (!unemploymentRef) {
    throw new Error(`Not enough unemployment history for ${config.code}`);
  }

  const inflationYoY = ((latestCpi.value - cpiRef.value) / cpiRef.value) * 100;
  const gdpTrillionUsd = latestGdp.value / 1_000_000_000_000;
  const realInterestRate = latestInterest.value - inflationYoY;
  const yieldCurveSlope = latestTenYearYield.value - latestInterest.value;
  const inflationTargetGap = inflationYoY - 2;
  const unemploymentChange12m = latestUnemployment.value - unemploymentRef.value;
  const miseryIndex = inflationYoY + latestUnemployment.value;

  return {
    code: config.code,
    name: config.name,
    metrics: {
      gdp: {
        label: 'GDP (Current US$)',
        value: gdpTrillionUsd,
        unit: 'usdT',
        date: latestGdp.date,
        series: [config.gdpSeries],
      },
      interestRate: {
        label: config.interestRateLabel,
        value: latestInterest.value,
        unit: '%',
        date: latestInterest.date,
        series: [config.interestRateSeries],
      },
      inflationYoY: {
        label: 'Inflation (CPI YoY)',
        value: inflationYoY,
        unit: '%',
        date: latestCpi.date,
        series: [config.cpiSeries],
      },
      unemploymentRate: {
        label: 'Unemployment Rate',
        value: latestUnemployment.value,
        unit: '%',
        date: latestUnemployment.date,
        series: [config.unemploymentSeries],
      },
      tenYearYield: {
        label: '10Y Government Yield',
        value: latestTenYearYield.value,
        unit: '%',
        date: latestTenYearYield.date,
        series: [config.tenYearYieldSeries],
      },
      realInterestRate: {
        label: 'Real Interest Rate',
        value: realInterestRate,
        unit: '%',
        date: latestCpi.date,
        series: [config.interestRateSeries, config.cpiSeries],
      },
      yieldCurveSlope: {
        label: 'Yield Curve Slope (10Y - Short)',
        value: yieldCurveSlope,
        unit: 'pp',
        date: latestTenYearYield.date,
        series: [config.tenYearYieldSeries, config.interestRateSeries],
      },
      inflationTargetGap: {
        label: 'Inflation Gap vs 2% Target',
        value: inflationTargetGap,
        unit: 'pp',
        date: latestCpi.date,
        series: [config.cpiSeries],
      },
      unemploymentChange12m: {
        label: 'Unemployment Change (12M)',
        value: unemploymentChange12m,
        unit: 'pp',
        date: latestUnemployment.date,
        series: [config.unemploymentSeries],
      },
      miseryIndex: {
        label: 'Misery Index (Inflation + Unemployment)',
        value: miseryIndex,
        unit: 'index',
        date: latestCpi.date,
        series: [config.cpiSeries, config.unemploymentSeries],
      },
    },
  };
}

async function fetchCsvWithTimeout(url: string): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= REQUEST_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: FRED_HEADERS,
      });

      if (!response.ok) {
        throw new Error(`FRED request failed (${response.status}) for ${url}`);
      }

      const csv = await response.text();
      if (!csv.trim()) {
        throw new Error(`FRED response was empty for ${url}`);
      }
      return csv;
    } catch (error) {
      lastError = error;
      if (attempt >= REQUEST_RETRY_DELAYS_MS.length) {
        break;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, REQUEST_RETRY_DELAYS_MS[attempt]);
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`FRED request failed for ${url}`);
}

async function loadIndicators(): Promise<IndicatorsResponse> {
  const today = new Date();
  const lookbackStart = new Date(today);
  lookbackStart.setUTCFullYear(lookbackStart.getUTCFullYear() - 6);
  const startDate = formatDate(lookbackStart);

  const uniqueSeriesIds = Array.from(
    new Set(
      COUNTRY_CONFIGS.flatMap((country) => [
        country.gdpSeries,
        country.interestRateSeries,
        country.cpiSeries,
        country.unemploymentSeries,
        country.tenYearYieldSeries,
      ]),
    ),
  );

  const seriesSettled = await Promise.allSettled(
    uniqueSeriesIds.map(async (seriesId) => {
      const csv = await fetchCsvWithTimeout(csvUrl(seriesId, startDate));
      return [seriesId, parseCsvSeries(csv)] as const;
    }),
  );

  const seriesMap = new Map<string, SeriesPoint[]>();
  for (const result of seriesSettled) {
    if (result.status !== 'fulfilled') {
      continue;
    }
    const [seriesId, points] = result.value;
    if (points.length > 0) {
      seriesMap.set(seriesId, points);
    }
  }

  const countries: CountrySnapshot[] = [];
  for (const config of COUNTRY_CONFIGS) {
    try {
      countries.push(buildCountrySnapshot(config, seriesMap));
    } catch {
      // Skip this country if one of its required series is missing or stale.
    }
  }

  if (countries.length === 0) {
    throw new Error('No country macro snapshots could be built from FRED data');
  }

  return {
    fetchedAt: new Date().toISOString(),
    source: 'FRED',
    countries,
  };
}

export async function GET() {
  const now = Date.now();
  const cached = globalIndicatorsCache.__economicIndicatorsCache;

  if (
    cached &&
    now - cached.cachedAt < CACHE_TTL_MS &&
    isIndicatorsResponse(cached.payload)
  ) {
    return NextResponse.json(cached.payload, {
      headers: {
        'x-cache': 'HIT',
      },
    });
  }

  if (cached && !isIndicatorsResponse(cached.payload)) {
    // Invalidate incompatible cache shapes left over from older route versions.
    globalIndicatorsCache.__economicIndicatorsCache = undefined;
  }

  try {
    const payload = await loadIndicators();

    globalIndicatorsCache.__economicIndicatorsCache = {
      payload,
      cachedAt: now,
    };

    return NextResponse.json(payload, {
      headers: {
        'x-cache': 'MISS',
      },
    });
  } catch (error) {
    if (cached && isIndicatorsResponse(cached.payload)) {
      return NextResponse.json(
        {
          ...cached.payload,
          stale: true,
          error: 'Using cached macro data due to upstream fetch failure.',
        },
        {
          headers: {
            'x-cache': 'STALE',
          },
        },
      );
    }

    const snapshot = await loadSnapshot();
    if (snapshot) {
      return NextResponse.json(
        {
          ...snapshot,
          stale: true,
          error: 'Using build snapshot because live macro data could not be fetched.',
        },
        {
          headers: {
            'x-cache': 'SNAPSHOT',
          },
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load economic indicators from upstream source.',
      },
      { status: 502 },
    );
  }
}
