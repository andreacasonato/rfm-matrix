// @vitest-environment jsdom
import {
  cellIndex,
  defaultSegmentMap,
  type SegmentMap,
  type SegmentsSummary,
  segmentFor,
  segmentMapToFile,
  setCell,
  summariseSegments,
} from '@rfm-matrix/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RulesScreen } from './RulesScreen';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const summary: SegmentsSummary = summariseSegments([], defaultSegmentMap);
const cellCustomers = Array.from({ length: 125 }, (_, i) => i);

function setup(saved: SegmentMap = defaultSegmentMap) {
  const applyMap = vi.fn(async (_map: SegmentMap) => summary);
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <RulesScreen
      saved={saved}
      segments={summary}
      cellCustomers={cellCustomers}
      session={{ applyMap }}
      onSave={onSave}
      onClose={onClose}
    />,
  );
  const lastMap = () => applyMap.mock.calls.at(-1)?.[0];
  return { applyMap, onSave, onClose, lastMap };
}

const cell = (name: string) => screen.getByRole('combobox', { name: `Segment for ${name}` });
const choose = async (name: string, segmentId: string) =>
  act(async () => fireEvent.change(cell(name), { target: { value: segmentId } }));

describe('RulesScreen (S7, PRD story 6)', () => {
  it('shows one choice per recency × frequency square, with its customers', () => {
    setup();
    expect(screen.getAllByRole('combobox')).toHaveLength(25);
    expect((cell('R5 F1') as HTMLSelectElement).value).toBe('new-customers');
    expect((cell('R1 F5') as HTMLSelectElement).value).toBe('cant-lose-them');
    // R5 F1 holds cells 100 to 104 in the fixture: 100 + 101 + 102 + 103 + 104.
    expect(screen.getByTestId('cell-R5-F1').textContent).toContain('510 customers');
    // R1 F1 for M2 alone holds 1 customer in the fixture.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Same rules for every M score' }));
    fireEvent.click(screen.getByRole('radio', { name: 'M2' }));
    expect(screen.getByTestId('cell-R1-F1').textContent).toContain('1 customer');
    expect(screen.getByTestId('cell-R1-F1').textContent).not.toContain('1 customers');
  });

  it('applies a change at once, says what changed, and undoes it', async () => {
    const fake = setup();
    await choose('R5 F1', 'champions');
    for (const m of [1, 2, 3, 4, 5] as const) {
      expect(fake.lastMap() && segmentFor(fake.lastMap() as SegmentMap, 5, 1, m)).toBe('champions');
    }
    const bar = screen.getByRole('status');
    expect(bar.textContent).toContain('R5 F1 is now Champions.');
    await act(async () => fireEvent.click(within(bar).getByRole('button', { name: 'Undo' })));
    expect((cell('R5 F1') as HTMLSelectElement).value).toBe('new-customers');
    expect(fake.lastMap()).toEqual(defaultSegmentMap);
  });

  it('hides the undo bar after 10 seconds', async () => {
    vi.useFakeTimers();
    setup();
    await choose('R5 F1', 'champions');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('gives each new change its own 10 seconds', async () => {
    vi.useFakeTimers();
    setup();
    await choose('R5 F1', 'champions');
    act(() => vi.advanceTimersByTime(6_000));
    await choose('R4 F1', 'lost');
    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.getByRole('status').textContent).toContain('R4 F1 is now Lost.');
  });

  it('keeps the 10 seconds when the counts arrive later', async () => {
    vi.useFakeTimers();
    let answer: (s: SegmentsSummary) => void = () => {};
    const applyMap = vi.fn(() => new Promise<SegmentsSummary>((resolve) => (answer = resolve)));
    render(
      <RulesScreen
        saved={defaultSegmentMap}
        segments={summary}
        cellCustomers={cellCustomers}
        session={{ applyMap }}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    await choose('R5 F1', 'champions');
    act(() => vi.advanceTimersByTime(9_000));
    await act(async () => answer({ ...summary }));
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('saves the edited rules with their summary', async () => {
    const fake = setup();
    const save = screen.getByRole('button', { name: 'Save rules' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await choose('R2 F1', 'lost');
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    const [map, segments] = fake.onSave.mock.calls[0] ?? [];
    expect(segmentFor(map, 2, 1, 4)).toBe('lost');
    expect(segments).toBe(summary);
  });

  it('discards changes by putting the saved rules back in the worker', async () => {
    const fake = setup();
    await choose('R2 F1', 'lost');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Discard changes' })));
    expect(fake.lastMap()).toEqual(defaultSegmentMap);
    expect(fake.onClose).toHaveBeenCalledOnce();
  });

  it('resets to the default rules, as a change that can be undone', async () => {
    const edited = setCell(defaultSegmentMap, { r: 4, f: 1, m: 'all' }, 'lost');
    const fake = setup(edited);
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Reset to default' })),
    );
    expect(fake.lastMap()).toEqual(defaultSegmentMap);
    expect(screen.getByRole('status').textContent).toContain('Default rules restored.');
  });

  it('lets one M score have its own rules, and copies a layer back to all five', async () => {
    const fake = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Same rules for every M score' }));
    fireEvent.click(screen.getByRole('radio', { name: 'M3' }));
    await choose('R3 F3 M3', 'champions');
    const map = fake.lastMap() as SegmentMap;
    expect(segmentFor(map, 3, 3, 3)).toBe('champions');
    expect(segmentFor(map, 3, 3, 4)).toBe('need-attention');
    // The M3 layer's own count: cell R3 F3 M3 only.
    expect(screen.getByTestId('cell-R3-F3').textContent).toContain(
      `${cellCustomers[cellIndex(3, 3, 3)]} customers`,
    );

    await act(async () =>
      fireEvent.click(screen.getByRole('checkbox', { name: 'Same rules for every M score' })),
    );
    expect(segmentFor(fake.lastMap() as SegmentMap, 3, 3, 4)).toBe('champions');
    expect(screen.getByRole('status').textContent).toContain(
      'Every M score now uses the M3 rules.',
    );
  });

  it('opens a file whose rules differ by M one M score at a time', async () => {
    const fake = setup();
    const map = setCell(defaultSegmentMap, { r: 3, f: 3, m: 5 }, 'champions');
    const file = new File([segmentMapToFile(map)], 'by-m.json');
    const input = document.querySelector('input[type=file]');
    if (!input) throw new Error('no file input');
    await act(async () => fireEvent.change(input, { target: { files: [file] } }));
    expect(fake.lastMap()).toEqual(map);
    const everyM = screen.getByRole('checkbox', { name: 'Same rules for every M score' });
    expect((everyM as HTMLInputElement).checked).toBe(false);
  });
});
