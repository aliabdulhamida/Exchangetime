export function parseConversionAmount(raw: string) {
  const trimmed = raw.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?$/.test(trimmed)) return null;
  const value = Number(trimmed.replaceAll(',', ''));
  return Number.isFinite(value) && value > 0 && value <= 1e15 ? value : null;
}

export function conversionValue(amount: number, rate: number) {
  const value = amount * rate;
  return Number.isFinite(amount) && amount > 0 && Number.isFinite(rate) && rate > 0 &&
    Number.isFinite(value) ? value : null;
}
