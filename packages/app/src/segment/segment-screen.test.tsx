// @vitest-environment jsdom
import { defaultSegmentMap, type Segment, type SegmentSummary } from '@rfm-matrix/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisSession } from '../analysis/analysis-client';
import type { CustomerRow, SegmentPage } from './customer-table';
import { SegmentScreen } from './SegmentScreen';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function segment(id: string): Segment {
  const found = defaultSegmentMap.segments.find((s) => s.id === id);
  if (!found) throw new Error(`no segment ${id}`);
  return found;
}
const champions = segment('champions');

const row = (i: number): CustomerRow => ({
  customer: i === 0 ? 'x'.repeat(60) : `c${i}`,
  email: `c${i}@example.test`,
  recencyDays: i,
  orders: 6,
  spend: 100 + i,
  r: 5,
  f: 5,
  m: 4,
});

function fakeSession(total: number) {
  const segmentPage = vi.fn(
    async (_id: string, _sort: unknown, page: number, size: number): Promise<SegmentPage> => ({
      total,
      rows: Array.from({ length: Math.max(0, Math.min(size, total - page * size)) }, (_, k) =>
        row(page * size + k),
      ),
    }),
  );
  const exportSegment = vi.fn(async () => ({ file: new Blob(['csv']), rows: total }));
  return {
    segmentPage,
    exportSegment,
    applyMap: vi.fn(),
    save: vi.fn(),
    scoreCounts: vi.fn(),
    applyScoring: vi.fn(),
  } satisfies AnalysisSession;
}

const summary = (customers: number): SegmentSummary => ({
  id: 'champions',
  name: 'Champions',
  customers,
  revenue: 1000,
  customerShare: customers / 540,
  revenueShare: 0.163,
});

async function renderScreen(total: number, hasEmail = true) {
  const session = fakeSession(total);
  const onExported = vi.fn();
  render(
    <SegmentScreen
      segment={champions}
      summary={summary(total)}
      session={session}
      analysisDate="2026-09-27"
      hasEmail={hasEmail}
      onBack={() => {}}
      onExported={onExported}
    />,
  );
  await act(async () => {});
  return { session, onExported };
}

describe('SegmentScreen (APP_FLOW "Segment detail")', () => {
  it('explains the segment in plain words with a suggested action', async () => {
    await renderScreen(120);
    expect(screen.getByRole('heading', { name: 'Champions' })).toBeTruthy();
    expect(screen.getByText('Thriving')).toBeTruthy();
    expect(screen.getByText(champions.description)).toBeTruthy();
    expect(screen.getByText(champions.suggestedAction)).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Segment summary' }).textContent).toContain(
      'Customers120',
    );
  });

  it('lists customers 50 at a time, biggest spenders first, with email when mapped', async () => {
    const { session } = await renderScreen(120);
    expect(session.segmentPage).toHaveBeenCalledWith(
      'champions',
      { key: 'spend', direction: 'desc' },
      0,
      50,
    );
    const table = screen.getByRole('table', { name: 'Customers in Champions' });
    expect(within(table).getAllByRole('row')).toHaveLength(51);
    expect(within(table).getByRole('columnheader', { name: /Email/ })).toBeTruthy();
    expect(screen.getByText('Showing 1–50 of 120')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Next page' })));
    expect(session.segmentPage).toHaveBeenLastCalledWith(
      'champions',
      { key: 'spend', direction: 'desc' },
      1,
      50,
    );
    expect(screen.getByText('Showing 51–100 of 120')).toBeTruthy();
  });

  it('sorts by a column when its header is clicked, then reverses on a second click', async () => {
    const { session } = await renderScreen(10);
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Sort by Recency (days)' })),
    );
    expect(session.segmentPage).toHaveBeenLastCalledWith(
      'champions',
      { key: 'recencyDays', direction: 'asc' },
      0,
      50,
    );
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Sort by Recency (days)' })),
    );
    expect(session.segmentPage).toHaveBeenLastCalledWith(
      'champions',
      { key: 'recencyDays', direction: 'desc' },
      0,
      50,
    );
    expect(screen.getByRole('columnheader', { name: /Recency/ }).getAttribute('aria-sort')).toBe(
      'descending',
    );
  });

  it('cuts long values at 40 characters and keeps the full text on hover', async () => {
    await renderScreen(3);
    const long = screen.getByTitle('x'.repeat(60));
    expect(long.textContent).toBe(`${'x'.repeat(40)}…`);
  });

  it('leaves out the email column when no email was mapped', async () => {
    await renderScreen(3, false);
    expect(screen.queryByRole('columnheader', { name: /Email/ })).toBeNull();
  });

  it('exports the segment and reports the file name and count', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    Object.assign(URL, { createObjectURL: () => 'blob:local/1', revokeObjectURL: () => {} });
    const { session, onExported } = await renderScreen(19);
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Export Champions' })),
    );
    expect(session.exportSegment).toHaveBeenCalledWith('champions', 'Champions');
    expect(click).toHaveBeenCalledOnce();
    expect(onExported).toHaveBeenCalledWith('Exported champions-2026-09-27.csv · 19 customers');
  });

  it('says so when the segment is empty, and cannot export', async () => {
    await renderScreen(0);
    expect(screen.getByRole('status').textContent).toContain('No customers here right now');
    expect(screen.getByRole('button', { name: 'Export Champions' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('shows an error when the list cannot be loaded', async () => {
    const session = fakeSession(5);
    session.segmentPage.mockRejectedValueOnce(new Error('The worker stopped unexpectedly'));
    render(
      <SegmentScreen
        segment={champions}
        summary={summary(5)}
        session={session}
        analysisDate="2026-09-27"
        hasEmail
        onBack={() => {}}
        onExported={() => {}}
      />,
    );
    await act(async () => {});
    expect(screen.getByRole('alert').textContent).toContain('The worker stopped unexpectedly');
  });
});
