import type { CustomerScore, Score } from '@rfm-matrix/core';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import {
  buildCustomerTable,
  exportFileName,
  segmentCsv,
  segmentPage,
  segmentRows,
  sortRows,
} from './customer-table';

const customer = (
  key: string,
  segmentId: string,
  recencyDays: number,
  frequency: number,
  monetary: number,
  email?: string,
): CustomerScore => ({
  customerKey: key,
  recencyDays,
  frequency,
  monetary,
  r: 5 as Score,
  f: (frequency > 5 ? 5 : frequency) as Score,
  m: 3 as Score,
  segmentId,
  ...(email ? { email } : {}),
});

const scores = [
  customer('=HYPERLINK("http://x.example")', 'champions', 3, 6, 540.5, 'a@example.test'),
  customer('c2', 'lost', 300, 1, 12),
  customer('c3', 'champions', 1, 9, -20, 'Zoë@example.test'),
];

describe('customer table', () => {
  const table = buildCustomerTable(scores, true);

  it('keeps every customer in compact columns', () => {
    expect(table.keys).toEqual(['=HYPERLINK("http://x.example")', 'c2', 'c3']);
    expect(Array.from(table.orders)).toEqual([6, 1, 9]);
    expect(table.emails).toEqual(['a@example.test', null, 'Zoë@example.test']);
  });

  it('keeps no emails when no email column was mapped', () => {
    expect(buildCustomerTable(scores, false).emails).toBeNull();
  });

  it('finds a segment’s customers and sorts them by any column', () => {
    const champions = segmentRows(table, 'champions');
    expect(champions).toEqual([0, 2]);
    expect(sortRows(table, champions, 'spend', 'desc')).toEqual([0, 2]);
    expect(sortRows(table, champions, 'recencyDays', 'asc')).toEqual([2, 0]);
    expect(sortRows(table, champions, 'orders', 'desc')).toEqual([2, 0]);
  });

  it('exports a safe CSV with the PRD story 7 columns', () => {
    const csv = segmentCsv(table, segmentRows(table, 'champions'), 'Champions');
    const rows = Papa.parse<string[]>(csv.replace(/^﻿/, ''), { skipEmptyLines: true }).data;
    expect(rows).toEqual([
      ['Customer ID', 'Email', 'Recency (days)', 'Orders', 'Spend', 'R', 'F', 'M', 'Segment'],
      [
        '\'=HYPERLINK("http://x.example")',
        'a@example.test',
        '3',
        '6',
        '540.50',
        '5',
        '5',
        '3',
        'Champions',
      ],
      ['c3', 'Zoë@example.test', '1', '9', '-20.00', '5', '5', '3', 'Champions'],
    ]);
  });

  it('leaves the Email column out when no email was mapped', () => {
    const plain = buildCustomerTable(scores, false);
    const csv = segmentCsv(plain, segmentRows(plain, 'lost'), 'Lost');
    expect(csv.split('\r\n')[0]).toBe('﻿Customer ID,Recency (days),Orders,Spend,R,F,M,Segment');
  });

  it('returns one sorted page of a segment for the detail list', () => {
    const page = segmentPage(table, 'champions', { key: 'spend', direction: 'asc' }, 0, 1);
    expect(page.total).toBe(2);
    expect(page.rows).toEqual([
      {
        customer: 'c3',
        email: 'Zoë@example.test',
        recencyDays: 1,
        orders: 9,
        spend: -20,
        r: 5,
        f: 5,
        m: 3,
      },
    ]);
    expect(
      segmentPage(table, 'champions', { key: 'spend', direction: 'asc' }, 1, 1).rows[0]?.customer,
    ).toBe('=HYPERLINK("http://x.example")');
    expect(segmentPage(table, 'promising', { key: 'spend', direction: 'asc' }, 0, 50)).toEqual({
      total: 0,
      rows: [],
    });
  });

  it('names the file after the segment and analysis date', () => {
    expect(exportFileName("Can't lose them", '2026-09-27')).toBe('cant-lose-them-2026-09-27.csv');
  });
});
