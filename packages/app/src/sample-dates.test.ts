import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { shiftSampleDates } from './sample-dates';

const csv = [
  'Name,Email,Paid at,Total,Created at',
  '#1001,c1@example.test,2024-10-01T00:26:53Z,153.66,2024-10-01T00:26:53Z',
  '#1002,c2@example.test,,20.00,2025-03-15T12:00:00Z',
  '#1003,c1@example.test,2026-09-26T23:59:59Z,99.10,2026-09-26T23:59:59Z',
].join('\n');

const stamps = (text: string) =>
  [...text.matchAll(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g)].map((m) => Date.parse(m[0]));

describe('shiftSampleDates', () => {
  it('moves the latest order to yesterday by the computer’s calendar', () => {
    const shifted = shiftSampleDates(csv, new Date(2027, 2, 15, 9, 30));
    expect(shifted).toContain(
      '#1003,c1@example.test,2027-03-14T23:59:59Z,99.10,2027-03-14T23:59:59Z',
    );
  });

  it('uses the local calendar day, even late in the evening', () => {
    const shifted = shiftSampleDates(csv, new Date(2027, 2, 15, 23, 59));
    expect(Math.max(...stamps(shifted))).toBe(Date.parse('2027-03-14T23:59:59Z'));
  });

  it('moves every date by the same whole number of days, so recency is unchanged', () => {
    const before = stamps(csv);
    const after = stamps(shiftSampleDates(csv, new Date(2027, 2, 15)));
    const moves = after.map((t, i) => t - (before[i] ?? Number.NaN));
    const days = (moves[0] ?? Number.NaN) / 86_400_000;
    expect(Number.isInteger(days)).toBe(true);
    expect(moves).toEqual(before.map(() => days * 86_400_000));
  });

  it('changes nothing but the dates', () => {
    const shifted = shiftSampleDates(csv, new Date(2027, 2, 15));
    const strip = (text: string) => text.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g, 'DATE');
    expect(strip(shifted)).toBe(strip(csv));
  });

  it('copes with a clock far in the past or the future', () => {
    for (const today of [new Date(1970, 0, 2), new Date(2200, 11, 31)]) {
      const latest = Math.max(...stamps(shiftSampleDates(csv, today)));
      const yesterday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      expect(Math.floor(latest / 86_400_000) * 86_400_000).toBe(yesterday);
    }
  });

  it('leaves a file without dates as it is', () => {
    expect(shiftSampleDates('a,b\n1,2', new Date(2027, 2, 15))).toBe('a,b\n1,2');
  });

  it('shifts the real sample file and keeps its row count', () => {
    const sample = readFileSync('packages/app/public/sample-orders.csv', 'utf8');
    const shifted = shiftSampleDates(sample, new Date(2027, 2, 15));
    expect(shifted.split('\n')).toHaveLength(sample.split('\n').length);
    expect(new Date(Math.max(...stamps(shifted))).toISOString().slice(0, 10)).toBe('2027-03-14');
  });
});
