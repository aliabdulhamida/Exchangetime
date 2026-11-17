export function normalizeNumberEntry(value: string, grouped = false): string {
  return grouped ? value.replaceAll(',', '') : value.replace(',', '.');
}

export function validateNumberEntry(
  value: string,
  min = '',
  max = '',
  required = false,
): string | null {
  if (!value.trim()) return required ? 'Enter a value.' : null;
  const normalized = value.replace(',', '.');
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized) || !Number.isFinite(Number(normalized)))
    return 'Enter a valid number.';
  if (
    (min !== '' && Number(normalized) < Number(min)) ||
    (max !== '' && Number(normalized) > Number(max))
  )
    return `Allowed range: ${min || '−∞'} to ${max || '∞'}.`;
  return null;
}

export function editNumberEntry(value: string, key: string, replace = false): string {
  if (key === 'delete') return value.slice(0, -1);
  if (key === 'clear') return '';
  if (key === 'sign') return value.startsWith('-') ? value.slice(1) : '-' + value;
  const next = replace ? '' : value;
  if (key === '.') return next.includes('.') ? next : (next || '0') + '.';
  return /^\d$/.test(key) ? next + key : value;
}
