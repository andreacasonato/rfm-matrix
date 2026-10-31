// @vitest-environment jsdom
import { defaultScoring, defaultSegmentMap, summariseSegments } from '@rfm-matrix/core';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisHandle } from '../analysis/analysis-client';
import type { DoneMessage, SaveResult } from '../analysis/protocol';
import { AnalysisView } from './AnalysisView';

afterEach(cleanup);

const result = {
  type: 'done',
  rowsRead: 10,
  rowsUsed: 10,
  invalidRows: 0,
  customers: 0,
  orders: 0,
  monetaryTotal: 0,
  cleaning: {
    used: 0,
    status: 0,
    withoutDate: 0,
    afterAnalysisDate: 0,
    beforeWindow: 0,
    refundsApplied: 0,
    customersWithoutOrders: 0,
  },
  scoring: defaultScoring,
  problems: [],
  analysisDate: '2026-10-01',
  segments: summariseSegments([], defaultSegmentMap),
  grid: [],
  cellCustomers: new Array(125).fill(0),
  repeatCustomers: 0,
  elapsedMs: 1,
} as unknown as DoneMessage;

function handle(saveResult: SaveResult) {
  const save = vi.fn(async () => saveResult);
  const session = {
    segmentPage: vi.fn(),
    exportSegment: vi.fn(),
    applyMap: vi.fn(),
    save,
    scoreCounts: vi.fn(),
    applyScoring: vi.fn(),
  };
  return {
    save,
    handle: { result: Promise.resolve(result), cancel: vi.fn(), session } as AnalysisHandle,
  };
}

const show = async (props: Partial<Parameters<typeof AnalysisView>[0]>, h: AnalysisHandle) => {
  render(<AnalysisView result={result} wallMs={1} hasEmail={false} handle={h} {...props} />);
  await act(async () => {});
};

describe('AnalysisView saving (S8)', () => {
  it('saves a new analysis as a project and says so', async () => {
    const fake = handle({ ok: true, projectId: 'p1', snapshotId: 's1' });
    await show(
      { project: { name: 'orders', sourceFileName: 'orders.csv', map: defaultSegmentMap } },
      fake.handle,
    );
    expect(fake.save).toHaveBeenCalledWith({
      projectName: 'orders',
      sourceFileName: 'orders.csv',
      map: defaultSegmentMap,
    });
    expect(screen.getByText('Saved on this device.')).toBeTruthy();
  });

  it('adds to an existing project', async () => {
    const fake = handle({ ok: true, projectId: 'p1', snapshotId: 's2' });
    const project = { id: 'p1', name: 'orders', sourceFileName: 'nov.csv', map: defaultSegmentMap };
    await show({ project }, fake.handle);
    expect(fake.save).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1' }));
  });

  it('warns when the browser storage is full, and keeps the grid', async () => {
    const fake = handle({ ok: false, storageFull: true, message: 'quota' });
    await show(
      { project: { name: 'orders', sourceFileName: 'orders.csv', map: defaultSegmentMap } },
      fake.handle,
    );
    expect(screen.getByText(/browser's storage is full/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit segment rules' })).toBeTruthy();
  });

  it('does not save the sample or an opened snapshot', async () => {
    const fake = handle({ ok: true, projectId: 'p1', snapshotId: 's1' });
    await show({}, fake.handle);
    await show({ project: { id: 'p1', name: 'orders', map: defaultSegmentMap } }, fake.handle);
    expect(fake.save).not.toHaveBeenCalled();
  });

  it('offers Movement once the analysis belongs to a saved project, not for the sample (S10)', async () => {
    const fake = handle({ ok: true, projectId: 'p1', snapshotId: 's1' });
    await show({}, fake.handle);
    expect(screen.queryByRole('button', { name: 'Movement' })).toBeNull();
    cleanup();
    await show(
      { project: { name: 'orders', sourceFileName: 'orders.csv', map: defaultSegmentMap } },
      fake.handle,
    );
    expect(screen.getByRole('button', { name: 'Movement' })).toBeTruthy();
  });
});
