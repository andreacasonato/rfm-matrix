// @vitest-environment jsdom
import {
  defaultScoring,
  defaultSegmentMap,
  type Movement,
  notInEarlier,
  notInLater,
  type ScoringMethods,
} from '@rfm-matrix/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SnapshotSummary } from '../storage/projects';
import { MovementScreen } from './MovementScreen';

afterEach(cleanup);

const snapshot = (id: string, day: string, file: string): SnapshotSummary => ({
  id,
  createdAt: Date.parse(`${day}T12:00:00Z`),
  sourceFileName: file,
  analysisDate: day,
  customerCount: 100,
  scoring: defaultScoring,
});
const snapshots = [
  snapshot('s1', '2026-08-01', 'aug.csv'),
  snapshot('s2', '2026-09-01', 'sep.csv'),
  snapshot('s3', '2026-10-01', 'oct.csv'),
];
const movement: Movement = {
  flows: [
    { from: 'champions', to: 'at-risk', customers: 12 },
    { from: 'promising', to: 'loyal-customers', customers: 5 },
    { from: notInEarlier, to: 'new-customers', customers: 3 },
    { from: 'lost', to: notInLater, customers: 1 },
  ],
  totals: { stayed: 80, moved: 17, newCustomers: 3, gone: 1 },
};

async function setup(list = snapshots) {
  const compare = vi.fn(async () => movement);
  const exportFlow = vi.fn(async () => ({ file: new Blob(['csv']), name: 'movers.csv', rows: 12 }));
  const download = vi.fn();
  const onExported = vi.fn();
  render(
    <MovementScreen
      snapshots={list}
      map={defaultSegmentMap}
      onBack={() => {}}
      onExported={onExported}
      compare={compare}
      exportFlow={exportFlow}
      download={download}
    />,
  );
  await act(async () => {});
  return { compare, exportFlow, download, onExported };
}

describe('Movement (S10, PRD story 8)', () => {
  it('compares the two latest analyses by default', async () => {
    const fake = await setup();
    expect(fake.compare).toHaveBeenCalledWith('s2', 's3', defaultSegmentMap);
    expect(screen.getByLabelText('Earlier analysis')).toHaveProperty('value', 's2');
    expect(screen.getByLabelText('Later analysis')).toHaveProperty('value', 's3');
    expect(document.body.textContent).toContain('use your current segment rules');
  });

  it('shows the totals and every flow, biggest first, in segment names', async () => {
    await setup();
    expect(document.body.textContent).toContain(
      '80 stayed in their segment, 17 moved, 3 are new, 1 is not in the later analysis.',
    );
    const rows = within(screen.getByRole('table', { name: 'Customers who moved' }))
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent);
    expect(rows).toEqual([
      expect.stringContaining('ChampionsAt risk12'),
      expect.stringContaining('PromisingLoyal customers5'),
      expect.stringContaining('Not in earlier analysisNew customers3'),
      expect.stringContaining('LostNot in later analysis1'),
    ]);
  });

  it('exports one flow and confirms it', async () => {
    const fake = await setup();
    await act(async () =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Export movers from Champions to At risk' }),
      ),
    );
    expect(fake.exportFlow).toHaveBeenCalledWith(
      's2',
      's3',
      defaultSegmentMap,
      'champions',
      'at-risk',
    );
    expect(fake.download).toHaveBeenCalledWith(expect.any(Blob), 'movers.csv');
    expect(fake.onExported).toHaveBeenCalledWith('movers.csv · 12 customers');
  });

  it('compares other analyses when chosen, and refuses a later one that is not later', async () => {
    const fake = await setup();
    await act(async () =>
      fireEvent.change(screen.getByLabelText('Earlier analysis'), { target: { value: 's1' } }),
    );
    expect(fake.compare).toHaveBeenLastCalledWith('s1', 's3', defaultSegmentMap);
    await act(async () =>
      fireEvent.change(screen.getByLabelText('Later analysis'), { target: { value: 's1' } }),
    );
    expect(screen.getByRole('alert').textContent).toContain('Choose a later analysis');
    expect(fake.compare).toHaveBeenCalledTimes(2);
  });

  it('explains how to get a second analysis when there is only one', async () => {
    const fake = await setup([snapshots[0] as SnapshotSummary]);
    expect(screen.getByRole('status').textContent).toContain('Movement needs two analyses');
    expect(document.body.textContent).toContain('Upload new export');
    expect(fake.compare).not.toHaveBeenCalled();
  });

  it('says when the two analyses used different score thresholds (U5)', async () => {
    await setup();
    expect(screen.queryByText(/different score thresholds/)).toBeNull();
    cleanup();
    const own: ScoringMethods = {
      ...defaultScoring,
      m: { method: 'fixed', breaks: [50, 100, 200, 400] },
    };
    await setup([
      snapshots[0] as SnapshotSummary,
      { ...(snapshots[1] as SnapshotSummary), scoring: own },
    ]);
    expect(screen.getByText('These analyses used different score thresholds')).toBeTruthy();
    expect(document.body.textContent).toContain(
      'some moves come from the change, not from customers',
    );
  });
});
