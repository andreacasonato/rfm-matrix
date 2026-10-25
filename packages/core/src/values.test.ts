import { describe, expect, it } from 'vitest';
import { detectDateOrder, detectDecimal, parseAmount, parseDate } from './values';

describe('parseAmount (ADR-0012 rule 3)', () => {
  it.each([
    ['12.50', '.', 12.5],
    ['1,234.50', '.', 1234.5],
    ['€12.50', '.', 12.5],
    ['12.50 EUR', '.', 12.5],
    ['$ 1,000', '.', 1000],
    ['-5.00', '.', -5],
    ['-€5.00', '.', -5],
    ['(5.00)', '.', -5],
    ['5.00-', '.', -5],
    ['12,50', ',', 12.5],
    ['1.234,56 €', ',', 1234.56],
    ['1 234,56', ',', 1234.56],
    ["1'234.50", '.', 1234.5],
    ['1.2E+05', '.', 120000],
    ['0', '.', 0],
  ] as const)('reads %j with decimal %j as %d', (text, decimal, expected) => {
    expect(parseAmount(text, decimal)).toBeCloseTo(expected, 10);
  });

  it('returns null for an empty cell, which is not the same as 0', () => {
    expect(parseAmount('  ', '.')).toBeNull();
  });

  it.each([
    ['abc', '.'],
    ['12.5.0', '.'],
    ['1,2345', '.'],
    ['0x10', '.'],
    ['12,50', '.'],
    ['1.234.5', ','],
  ] as const)('refuses %j with decimal %j', (text, decimal) => {
    expect(parseAmount(text, decimal)).toBeNaN();
  });
});

describe('detectDecimal', () => {
  it.each([
    [['12.50', '3.10', '1,200.00'], '.'],
    [['12,50', '3,1', '1.200,00'], ','],
    [['12', '30'], '.'],
    [['€ 9,99', '', '19,90 €'], ','],
  ] as const)('finds the decimal separator in %j', (samples, expected) => {
    expect(detectDecimal([...samples])).toBe(expected);
  });
});

const utc = (...parts: number[]) =>
  Date.UTC(
    parts[0] ?? 0,
    (parts[1] ?? 1) - 1,
    parts[2] ?? 1,
    parts[3] ?? 0,
    parts[4] ?? 0,
    parts[5] ?? 0,
  );

describe('parseDate (ADR-0012 rule 2)', () => {
  it.each([
    ['2026-04-03', utc(2026, 4, 3)],
    ['2026-04-03T10:20:30Z', utc(2026, 4, 3, 10, 20, 30)],
    ['2026-04-03 10:20:30 +0100', utc(2026, 4, 3, 9, 20, 30)],
    ['2026-04-03T10:20:30.123+02:00', utc(2026, 4, 3, 8, 20, 30)],
    ['2026/04/03 10:20', utc(2026, 4, 3, 10, 20)],
  ])('reads ISO-style %j in any order setting', (text, expected) => {
    expect(parseDate(text, 'dmy')).toBe(expected);
    expect(parseDate(text, 'mdy')).toBe(expected);
  });

  it('reads day/month/year and month/day/year by the chosen order', () => {
    expect(parseDate('03/04/2026', 'dmy')).toBe(utc(2026, 4, 3));
    expect(parseDate('03/04/2026', 'mdy')).toBe(utc(2026, 3, 4));
    expect(parseDate('3.4.26 14:05', 'dmy')).toBe(utc(2026, 4, 3, 14, 5));
    expect(parseDate('4/3/2026 2:05 PM', 'mdy')).toBe(utc(2026, 4, 3, 14, 5));
    expect(parseDate('4/3/2026 12:05 AM', 'mdy')).toBe(utc(2026, 4, 3, 0, 5));
  });

  it.each([
    ['31/02/2026', 'dmy'],
    ['13/13/2026', 'dmy'],
    ['25/12/2026', 'mdy'],
    ['yesterday', 'dmy'],
    ['2026-02-30', 'dmy'],
    ['1', 'dmy'],
    ['Jan 5, 2026', 'mdy'],
  ] as const)('refuses %j as %s', (text, order) => {
    expect(parseDate(text, order)).toBeNaN();
  });
});

describe('detectDateOrder', () => {
  it.each([
    [['2026-01-05 10:00:00 +0100', '2026-02-01'], 'iso'],
    [['03/04/2026', '25/04/2026'], 'dmy'],
    [['03/04/2026', '04/25/2026'], 'mdy'],
    [['03/04/2026', '05/06/2026'], 'ambiguous'],
    [['25/04/2026', '04/25/2026'], 'unknown'],
    [['', 'n/a'], 'unknown'],
  ] as const)('reads %j as %s', (samples, expected) => {
    expect(detectDateOrder([...samples])).toBe(expected);
  });
});

// Regression: a hostile file with a huge cell made the symbol-stripping pattern take quadratic
// time (20,000 letters took about a second; a million would hang the worker).
describe('very long cells', () => {
  const huge = `${'a'.repeat(20_000)}1`;

  it.each([
    ['parseAmount', () => parseAmount(huge, '.')],
    ['parseDate', () => parseDate(huge, 'dmy')],
    ['detectDecimal', () => detectDecimal([huge, huge])],
    ['detectDateOrder', () => detectDateOrder([huge])],
  ])('%s refuses them quickly', (_name, run) => {
    const started = performance.now();
    run();
    expect(performance.now() - started).toBeLessThan(50);
  });

  it('are not amounts or dates', () => {
    expect(parseAmount(huge, '.')).toBeNaN();
    expect(parseDate(huge, 'dmy')).toBeNaN();
  });
});
