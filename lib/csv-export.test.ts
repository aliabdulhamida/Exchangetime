import { expect, it } from 'vitest';

import { serializeCsv } from './csv-export';

it('preserves signed numbers, embedded commas, quotes and multiline notes', () => {
  expect(
    serializeCsv([
      ['name', 'P/L'],
      ['a,"b"\nc', -12],
    ]),
  ).toBe('"name","P/L"\r\n"a,""b""\nc","-12"');
});
it('exports formula-like text as text even after leading spaces', () => {
  expect(serializeCsv([['  =test', '@user', '\ttest']])).toBe('"\'  =test","\'@user","\'\ttest"');
});
