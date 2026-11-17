type Cell = string | number;

export function serializeCsv(rows: readonly (readonly Cell[])[]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const raw = String(cell);
          const prefix = typeof cell === 'string' && /^(?:[\t\r\n]|\s*[=+@-])/.test(raw) ? "'" : '';
          return '"' + prefix + raw.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
}

export function downloadCsv(filename: string, rows: readonly (readonly Cell[])[]) {
  const url = URL.createObjectURL(
    new Blob([serializeCsv(rows)], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
