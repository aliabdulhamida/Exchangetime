import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REQUEST_TIMEOUT_MS = 20_000;
const REQUEST_RETRY_DELAYS_MS = [350, 850];
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'economic-indicators.json');
const FRED_HEADERS = {
  Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

const COUNTRY_CONFIGS = [
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

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function csvUrl(seriesId, startDate) {
  const params = new URLSearchParams({
    id: seriesId,
    cosd: startDate,
  });
  return `https://fred.stlouisfed.org/graph/fredgraph.csv?${params.toString()}`;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseCsvSeries(csv) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return [];
  }

  const points = [];
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

function parseDateToUtcMs(value) {
  return Date.parse(`${value}T00:00:00.000Z`);
}

function monthsAgo(date, monthDelta) {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCMonth(base.getUTCMonth() - monthDelta);
  return formatDate(base);
}

function latestPoint(series, seriesId) {
  if (series.length === 0) {
    throw new Error(`No observations available for ${seriesId}`);
  }
  return series[series.length - 1];
}

function findPointAtOrBefore(series, date) {
  const targetMs = parseDateToUtcMs(date);
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const pointMs = parseDateToUtcMs(series[i].date);
    if (Number.isFinite(pointMs) && pointMs <= targetMs) {
      return series[i];
    }
  }
  return null;
}

function getSeriesOrThrow(seriesMap, seriesId) {
  const series = seriesMap.get(seriesId);
  if (!series || series.length === 0) {
    throw new Error(`Series ${seriesId} is unavailable`);
  }
  return series;
}

function buildCountrySnapshot(config, seriesMap) {
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

async function fetchCsvWithTimeout(url) {
  let lastError = null;

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

async function loadIndicators() {
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
      return [seriesId, parseCsvSeries(csv)];
    }),
  );

  const seriesMap = new Map();
  for (const result of seriesSettled) {
    if (result.status !== 'fulfilled') {
      continue;
    }
    const [seriesId, points] = result.value;
    if (points.length > 0) {
      seriesMap.set(seriesId, points);
    }
  }

  const countries = [];
  for (const config of COUNTRY_CONFIGS) {
    try {
      countries.push(buildCountrySnapshot(config, seriesMap));
    } catch {
      // Skip countries with missing source series.
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

try {
  const payload = await loadIndicators();
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote ${OUTPUT_FILE} with ${payload.countries.length} countries at ${payload.fetchedAt}`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
