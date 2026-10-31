// @vitest-environment jsdom
import { type BinSizes, type DimensionMethod, defaultSegmentMap } from '@rfm-matrix/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisSession, ScoringApplied } from '../analysis/analysis-client';
import { ThresholdsScreen } from './ThresholdsScreen';

afterEach(cleanup);

const quintiles = { r: [20, 60, 120, 250], f: [1, 2, 3, 5], m: [40, 90, 150, 300] } as const;
const counts: BinSizes = [100, 80, 60, 40, 20];

function session(applied?: Partial<ScoringApplied>) {
  const scoreCounts = vi.fn(async (d: 'r' | 'f' | 'm', method: DimensionMethod) => ({
    breakpoints: method.method === 'fixed' ? method.breaks : [...quintiles[d]],
    counts,
  }));
  const applyScoring = vi.fn(async (scoring) => ({
    scoring,
    breakpoints: { r: [...quintiles.r], f: [...quintiles.f], m: [50, 100, 200, 500] },
    segments: { segments: [], totals: { customers: 300, revenue: 0 } },
    grid: [],
    cellCustomers: [],
    saved: null,
    ...applied,
  })) as AnalysisSession['applyScoring'];
  return { scoreCounts, applyScoring } as unknown as AnalysisSession & {
    scoreCounts: typeof scoreCounts;
  };
}

async function renderScreen(s = session(), saving = false) {
  const onApplied = vi.fn();
  render(
    <ThresholdsScreen
      scoring={{
        r: { method: 'quantile' },
        f: { method: 'fixed', breaks: [1, 2, 3, 5] },
        m: { method: 'quantile' },
      }}
      breakpoints={{ r: [...quintiles.r], f: [...quintiles.f], m: [...quintiles.m] }}
      map={defaultSegmentMap}
      session={s}
      saving={saving}
      onApplied={onApplied}
      onClose={vi.fn()}
    />,
  );
  // Counts are asked for a moment after the screen opens or a threshold changes.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
  return onApplied;
}

const own = (dimension: string) =>
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: `${dimension}: who decides` })).getByLabelText(
      /Set my own/,
    ),
  );

describe('ThresholdsScreen (U5)', () => {
  it('starts from this analysis and shows how many customers hold each score', async () => {
    const s = session();
    await renderScreen(s);
    expect(screen.getByLabelText('Monetary score 5: more than what amount')).toHaveProperty(
      'value',
      '300',
    );
    expect(s.scoreCounts).toHaveBeenCalledWith('m', { method: 'quantile' });
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
  });

  it('asks the worker for new counts as thresholds change, and applies them', async () => {
    const s = session();
    const onApplied = await renderScreen(s);
    const apply = screen.getByRole('button', { name: 'Apply thresholds' });
    expect(apply).toHaveProperty('disabled', true);

    own('Monetary');
    fireEvent.change(screen.getByLabelText('Monetary score 5: more than what amount'), {
      target: { value: '500' },
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(s.scoreCounts).toHaveBeenLastCalledWith('m', {
      method: 'fixed',
      breaks: [40, 90, 150, 500],
    });

    await act(async () => {
      fireEvent.click(apply);
    });
    expect(s.applyScoring).toHaveBeenCalledWith(
      {
        r: { method: 'quantile' },
        f: { method: 'fixed', breaks: [1, 2, 3, 5] },
        m: { method: 'fixed', breaks: [40, 90, 150, 500] },
      },
      defaultSegmentMap,
    );
    expect(onApplied).toHaveBeenCalledWith(expect.objectContaining({ saved: null }));
  });

  it('cannot apply while a threshold is unusable or while the analysis is still saving', async () => {
    await renderScreen();
    own('Monetary');
    fireEvent.change(screen.getByLabelText('Monetary score 5: more than what amount'), {
      target: { value: '10' },
    });
    expect(screen.getByRole('button', { name: 'Apply thresholds' })).toHaveProperty(
      'disabled',
      true,
    );
    cleanup();
    await renderScreen(session(), true);
    own('Monetary');
    fireEvent.change(screen.getByLabelText('Monetary score 5: more than what amount'), {
      target: { value: '900' },
    });
    expect(screen.getByRole('button', { name: 'Apply thresholds' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByText(/still being saved/)).toBeTruthy();
  });
});
