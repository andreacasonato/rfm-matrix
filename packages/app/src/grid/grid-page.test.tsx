// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisPlan, DoneMessage, WorkerMessage } from '../analysis/protocol';
import { runAnalysis } from '../analysis/run-analysis';
import { GridPage } from './GridPage';

afterEach(cleanup);

const plan: AnalysisPlan = {
  mapping: { orderId: 0, email: 1, orderedAt: 2, amount: 3 },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};
const csv = [
  'Name,Email,Created at,Total',
  ...['a', 'b', 'c', 'd', 'e', 'f'].map(
    (c, i) => `#${i},${c}@example.test,2026-03-0${i + 1},${10 * (i + 1)}`,
  ),
].join('\n');

async function result(): Promise<DoneMessage> {
  const messages: WorkerMessage[] = [];
  await runAnalysis(csv, plan, (m) => messages.push(m));
  const done = messages.at(-1);
  if (done?.type !== 'done') throw new Error('analysis failed');
  return done;
}

describe('GridPage opens segments (S6)', () => {
  it('from the segment list', async () => {
    const onOpenSegment = vi.fn();
    render(<GridPage result={await result()} wallMs={1} onOpenSegment={onOpenSegment} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Lost' }));
    expect(onOpenSegment).toHaveBeenCalledWith('lost');
  });

  it('from a heatmap cell', async () => {
    const onOpenSegment = vi.fn();
    render(<GridPage result={await result()} wallMs={1} onOpenSegment={onOpenSegment} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open New customers, R5 F1' }));
    expect(onOpenSegment).toHaveBeenCalledWith('new-customers');
  });
});
