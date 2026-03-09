const PLACEHOLDER = '-';

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatCurrencyAmount(
  value: number | null | undefined,
  currency = 'USD',
  locale = 'en-US',
): string {
  if (!isFiniteNumber(value)) return PLACEHOLDER;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentValue(value: number | null | undefined, locale = 'en-US'): string {
  if (!isFiniteNumber(value)) return PLACEHOLDER;
  const sign = value >= 0 ? '+' : '-';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${sign}${formatted}%`;
}

export function formatSharesValue(value: number | null | undefined, locale = 'en-US'): string {
  if (!isFiniteNumber(value)) return PLACEHOLDER;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatCompactCurrencyAxis(
  value: number | null | undefined,
  currency = 'USD',
  locale = 'en-US',
): string {
  if (!isFiniteNumber(value)) return PLACEHOLDER;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDateLabel(value: string, locale = 'en-US'): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
