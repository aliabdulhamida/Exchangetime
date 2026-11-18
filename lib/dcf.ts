export function parseDcfNumber(value: unknown, currency: string): number {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim();
  if (!text.includes(',')) return Number(text);
  if (currency === 'USD' || currency === 'GBP') return Number(text.replace(/,/g, ''));
  return Number(text.replace(/\./g, '').replace(',', '.'));
}

export function dcfSensitivityValue(input: {
  discountPct: number; terminal: number; multiple: boolean; cashflows: number[];
  cash: number; debt: number; shares: number; midYear: boolean;
}) {
  const {discountPct, terminal, multiple, cashflows, cash, debt, shares, midYear} = input;
  if (![discountPct, terminal, cash, debt, shares, ...cashflows].every(Number.isFinite) ||
    discountPct <= -99 || shares <= 0 || !cashflows.length || (multiple && terminal < 0)) return NaN;
  const rate = discountPct / 100;
  const growth = terminal / 100;
  if (!multiple && (rate <= growth || growth <= -1)) return NaN;
  const explicit = cashflows.reduce((sum, flow, index) => sum + flow / (1 + rate) ** (index + (midYear ? .5 : 1)), 0);
  const last = cashflows[cashflows.length - 1];
  const terminalValue = multiple ? last * terminal : last * (1 + growth) / (rate - growth);
  const value = (explicit + terminalValue / (1 + rate) ** (cashflows.length - (midYear ? .5 : 0)) + cash - debt) / shares;
  return Number.isFinite(value) ? value : NaN;
}

export function sensitivityRange(center: number, step: number, min: number, max: number) {
  return [...new Set([-2, -1, 0, 1, 2].map(offset => Math.max(min, Math.min(max, center + step * offset))))];
}
