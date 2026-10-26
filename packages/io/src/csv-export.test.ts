import fc from 'fast-check';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { escapeTextCell, toCsv } from './csv-export';

const parse = (csv: string) =>
  Papa.parse<string[]>(csv.replace(/^﻿/, ''), { skipEmptyLines: true }).data;

describe('escapeTextCell (AGENTS.md, OWASP CSV injection)', () => {
  it.each([
    ['=1+1', "'=1+1"],
    ['+SUM(A1:A9)', "'+SUM(A1:A9)"],
    ['-2+3', "'-2+3"],
    ['@cmd', "'@cmd"],
    ['\t=1+1', "'\t=1+1"],
    ['\r=1+1', "'\r=1+1"],
    ['=HYPERLINK("http://x.example","click")', '\'=HYPERLINK("http://x.example","click")'],
  ])('makes %j inert', (text, escaped) => {
    expect(escapeTextCell(text)).toBe(escaped);
  });

  it.each(['c0001@example.test', 'Zürich', '名前', '#1001', 'a=b', ''])(
    'leaves %j as it is',
    (text) => {
      expect(escapeTextCell(text)).toBe(text);
    },
  );
});

describe('toCsv', () => {
  it('starts with a UTF-8 byte-order mark and ends lines with CRLF', () => {
    const csv = toCsv(['a', 'b'], [['x', 1]]);
    expect(csv.startsWith('﻿a,b\r\nx,1\r\n')).toBe(true);
  });

  it('quotes commas, quotes and line breaks so every value survives a round trip', () => {
    const rows = [['Mug, large', 'say "hi"', 'two\nlines', 'Zürich', '名前']];
    const csv = toCsv(['a', 'b', 'c', 'd', 'e'], rows);
    expect(parse(csv)).toEqual([['a', 'b', 'c', 'd', 'e'], ...rows]);
  });

  it('escapes text cells but writes computed numbers as numbers, negatives included', () => {
    const csv = toCsv(
      ['id', 'spend', 'days'],
      [
        ['=cmd()', { money: -20 }, 3],
        ['-5', { money: 12.5 }, 0],
      ],
    );
    expect(parse(csv)).toEqual([
      ['id', 'spend', 'days'],
      ["'=cmd()", '-20.00', '3'],
      ["'-5", '12.50', '0'],
    ]);
  });

  it('writes other numbers as they are, without grouping', () => {
    const csv = toCsv(['n'], [[7], [1_000_000], [-3]]);
    expect(parse(csv)).toEqual([['n'], ['7'], ['1000000'], ['-3']]);
  });

  it('writes empty cells for missing or impossible numbers', () => {
    const csv = toCsv(['a', 'b', 'c', 'd'], [[null, Number.NaN, undefined, { money: Infinity }]]);
    expect(parse(csv)).toEqual([
      ['a', 'b', 'c', 'd'],
      ['', '', '', ''],
    ]);
  });

  it('escapes header cells too', () => {
    expect(parse(toCsv(['=x'], []))).toEqual([["'=x"]]);
  });
});

describe('escaping, for any text (property)', () => {
  // Arbitrary text, plus text that starts with a formula character on purpose.
  const text = fc.oneof(
    fc.string({ unit: 'binary' }),
    fc
      .tuple(fc.constantFrom('=', '+', '-', '@', '\t', '\r'), fc.string({ unit: 'binary' }))
      .map(([start, rest]) => start + rest),
  );

  it('reads back as the same text, never starting with a formula character', () => {
    fc.assert(
      fc.property(text, (value) => {
        const [, row] = parse(toCsv(['Value', 'End'], [[value, 'end']]));
        const cell = row?.[0] ?? '';
        expect(cell).not.toMatch(/^[=+\-@\t\r]/);
        expect(row?.[1]).toBe('end');
        expect(cell === value || cell === `'${value}`).toBe(true);
      }),
      { numRuns: 2000 },
    );
  });
});
