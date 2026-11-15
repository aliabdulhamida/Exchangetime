export function parseDcfNumber(value: unknown, currency: string): number {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim();
  if (!text.includes(',')) return Number(text);
  if (currency === 'USD' || currency === 'GBP') return Number(text.replace(/,/g, ''));
  return Number(text.replace(/\./g, '').replace(',', '.'));
}
