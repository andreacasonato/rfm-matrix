// @vitest-environment jsdom
import type { SegmentsSummary } from '@rfm-matrix/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SegmentPanel } from './SegmentPanel';
import { nextSort, type SegmentSort, sortSegments } from './segment-sort';

afterEach(cleanup);

const row = (id: string, name: string, customers: number, revenue: number) => ({
  id,
  name,
  customers,
  revenue,
  customerShare: customers / 100,
  revenueShare: revenue / 1000,
});

// Champions first, as the map orders them; Lost and Hibernating tie on customers.
const segments = [
  row('champions', 'Champions', 10, 500),
  row('at-risk', 'At risk', 40, 100),
  row('hibernating', 'Hibernating', 25, 50),
  row('lost', 'Lost', 25, 350),
];
const summary: SegmentsSummary = { segments, totals: { customers: 100, revenue: 1000 } };
const ids = (list: { id: string }[]) => list.map((s) => s.id);

describe('sortSegments', () => {
  it('keeps the map order by default', () => {
    expect(ids(sortSegments(segments, { key: 'segment' }))).toEqual(ids(segments));
  });

  it('sorts customers, share and revenue both ways', () => {
    const by = (key: SegmentSort['key'], direction: 'ascending' | 'descending') =>
      ids(sortSegments(segments, { key, direction } as SegmentSort));
    expect(by('customers', 'descending')).toEqual(['at-risk', 'hibernating', 'lost', 'champions']);
    expect(by('customers', 'ascending')).toEqual(['champions', 'hibernating', 'lost', 'at-risk']);
    expect(by('share', 'descending')).toEqual(by('customers', 'descending'));
    expect(by('revenue', 'descending')).toEqual(['champions', 'lost', 'at-risk', 'hibernating']);
    expect(by('revenue', 'ascending')).toEqual(['hibernating', 'at-risk', 'lost', 'champions']);
  });

  it('keeps equal values in map order, whichever the direction', () => {
    const asc = ids(sortSegments(segments, { key: 'customers', direction: 'ascending' }));
    const desc = ids(sortSegments(segments, { key: 'customers', direction: 'descending' }));
    expect(asc.indexOf('hibernating')).toBeLessThan(asc.indexOf('lost'));
    expect(desc.indexOf('hibernating')).toBeLessThan(desc.indexOf('lost'));
  });

  it('does not change the list it was given', () => {
    const before = ids(segments);
    sortSegments(segments, { key: 'revenue', direction: 'ascending' });
    expect(ids(segments)).toEqual(before);
  });

  it('stays fast for a large edited map', () => {
    const many = Array.from({ length: 200 }, (_, i) => row(`s${i}`, `S${i}`, i % 7, i % 13));
    const start = performance.now();
    sortSegments(many, { key: 'revenue', direction: 'descending' });
    expect(performance.now() - start).toBeLessThan(20);
  });
});

describe('nextSort', () => {
  it('sorts highest first on the first click, then flips', () => {
    const first = nextSort({ key: 'segment' }, 'customers');
    expect(first).toEqual({ key: 'customers', direction: 'descending' });
    expect(nextSort(first, 'customers')).toEqual({ key: 'customers', direction: 'ascending' });
    expect(nextSort({ key: 'customers', direction: 'ascending' }, 'customers')).toEqual(first);
  });

  it('starts a new column highest first and returns to map order from Segment', () => {
    const current: SegmentSort = { key: 'customers', direction: 'ascending' };
    expect(nextSort(current, 'revenue')).toEqual({ key: 'revenue', direction: 'descending' });
    expect(nextSort(current, 'segment')).toEqual({ key: 'segment' });
  });
});

describe('SegmentPanel sorting', () => {
  const names = () =>
    within(screen.getByRole('table'))
      .getAllByRole('rowheader')
      .map((h) => h.textContent);
  const header = (name: string) => screen.getByRole('columnheader', { name: new RegExp(name) });

  it('sorts by the clicked column and says so to screen readers', () => {
    render(<SegmentPanel summary={summary} />);
    expect(names()).toEqual(['Champions', 'At risk', 'Hibernating', 'Lost', 'Total']);
    expect(header('Customers').getAttribute('aria-sort')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Customers/ }));
    expect(names()).toEqual(['At risk', 'Hibernating', 'Lost', 'Champions', 'Total']);
    expect(header('Customers').getAttribute('aria-sort')).toBe('descending');

    fireEvent.click(screen.getByRole('button', { name: /Customers/ }));
    expect(names()).toEqual(['Champions', 'Hibernating', 'Lost', 'At risk', 'Total']);
    expect(header('Customers').getAttribute('aria-sort')).toBe('ascending');

    fireEvent.click(screen.getByRole('button', { name: /Revenue/ }));
    expect(names()).toEqual(['Champions', 'Lost', 'At risk', 'Hibernating', 'Total']);
    expect(header('Customers').getAttribute('aria-sort')).toBeNull();
    expect(header('Revenue').getAttribute('aria-sort')).toBe('descending');
  });

  it('returns to map order from the Segment header', () => {
    render(<SegmentPanel summary={summary} />);
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));
    fireEvent.click(screen.getByRole('button', { name: /Segment/ }));
    expect(names()).toEqual(['Champions', 'At risk', 'Hibernating', 'Lost', 'Total']);
  });

  it('keeps each segment open-able after sorting', () => {
    const opened: string[] = [];
    render(<SegmentPanel summary={summary} onOpen={(id) => opened.push(id)} />);
    fireEvent.click(screen.getByRole('button', { name: /Revenue/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Lost' }));
    expect(opened).toEqual(['lost']);
  });
});
