// Every scored customer in compact columns. It stays inside the worker after an analysis; the
// page asks for one sorted page or one segment's export at a time (S6), so it never holds
// hundreds of thousands of customers itself.
import type { CustomerScore } from '@rfm-matrix/core';
import { type CsvValue, toCsv } from '@rfm-matrix/io';

export type CustomerTable = {
  keys: string[];
  /** Null when no email column was mapped: then no email is kept at all (SCHEMA.md). */
  emails: (string | null)[] | null;
  recencyDays: Int32Array;
  orders: Int32Array;
  spend: Float64Array;
  r: Uint8Array;
  f: Uint8Array;
  m: Uint8Array;
  segmentIds: string[];
  segment: Uint8Array;
};

export type SortKey = 'customer' | 'email' | 'recencyDays' | 'orders' | 'spend' | 'r' | 'f' | 'm';
export type Sort = { key: SortKey; direction: 'asc' | 'desc' };
export type CustomerRow = {
  customer: string;
  email: string | null;
  recencyDays: number;
  orders: number;
  spend: number;
  r: number;
  f: number;
  m: number;
};
export type SegmentPage = { total: number; rows: CustomerRow[] };

export function buildCustomerTable(scores: CustomerScore[], withEmail: boolean): CustomerTable {
  const n = scores.length;
  const segmentIds: string[] = [];
  const table: CustomerTable = {
    keys: new Array(n),
    emails: withEmail ? new Array(n) : null,
    recencyDays: new Int32Array(n),
    orders: new Int32Array(n),
    spend: new Float64Array(n),
    r: new Uint8Array(n),
    f: new Uint8Array(n),
    m: new Uint8Array(n),
    segmentIds,
    segment: new Uint8Array(n),
  };
  scores.forEach((c, i) => {
    table.keys[i] = c.customerKey;
    if (table.emails) table.emails[i] = c.email ?? null;
    table.recencyDays[i] = c.recencyDays;
    table.orders[i] = c.frequency;
    table.spend[i] = c.monetary;
    table.r[i] = c.r;
    table.f[i] = c.f;
    table.m[i] = c.m;
    let id = segmentIds.indexOf(c.segmentId);
    if (id < 0) id = segmentIds.push(c.segmentId) - 1;
    table.segment[i] = id;
  });
  return table;
}

export function segmentRows(table: CustomerTable, segmentId: string): number[] {
  const id = table.segmentIds.indexOf(segmentId);
  const rows: number[] = [];
  if (id < 0) return rows;
  for (let i = 0; i < table.segment.length; i++) if (table.segment[i] === id) rows.push(i);
  return rows;
}

function cellValue(table: CustomerTable, key: SortKey, i: number): string | number {
  if (key === 'customer') return table.keys[i] ?? '';
  if (key === 'email') return table.emails?.[i] ?? '';
  return table[key][i] ?? 0;
}

export function sortRows(
  table: CustomerTable,
  rows: number[],
  key: SortKey,
  direction: Sort['direction'],
) {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = cellValue(table, key, a);
    const y = cellValue(table, key, b);
    const order =
      typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return order * sign || a - b;
  });
}

export function segmentPage(
  table: CustomerTable,
  segmentId: string,
  sort: Sort,
  page: number,
  pageSize: number,
): SegmentPage {
  const rows = sortRows(table, segmentRows(table, segmentId), sort.key, sort.direction);
  return {
    total: rows.length,
    rows: rows.slice(page * pageSize, (page + 1) * pageSize).map((i) => ({
      customer: table.keys[i] ?? '',
      email: table.emails?.[i] ?? null,
      recencyDays: table.recencyDays[i] ?? 0,
      orders: table.orders[i] ?? 0,
      spend: table.spend[i] ?? 0,
      r: table.r[i] ?? 0,
      f: table.f[i] ?? 0,
      m: table.m[i] ?? 0,
    })),
  };
}

/** The segment as CSV for an email tool (PRD story 7), made safe by io (ADR-0014). */
export function segmentCsv(table: CustomerTable, rows: number[], segmentName: string): string {
  const withEmail = table.emails !== null;
  const header = [
    'Customer ID',
    ...(withEmail ? ['Email'] : []),
    'Recency (days)',
    'Orders',
    'Spend',
    'R',
    'F',
    'M',
    'Segment',
  ];
  const body = rows.map((i): CsvValue[] => [
    table.keys[i] ?? '',
    ...(withEmail ? [table.emails?.[i] ?? null] : []),
    table.recencyDays[i],
    table.orders[i],
    { money: table.spend[i] ?? Number.NaN },
    table.r[i],
    table.f[i],
    table.m[i],
    segmentName,
  ]);
  return toCsv(header, body);
}

export function exportFileName(segmentName: string, analysisDate: string): string {
  const slug = segmentName
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${analysisDate}.csv`;
}
