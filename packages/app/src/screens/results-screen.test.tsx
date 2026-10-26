// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DoneMessage, ProgressMessage } from '../analysis/protocol';
import { WorkerJobError } from '../analysis/worker-client';
import { ResultsScreen } from './ResultsScreen';

afterEach(cleanup);

function fakeAnalysis() {
  let reject: (error: Error) => void = () => {};
  let progress: (p: ProgressMessage) => void = () => {};
  const cancel = vi.fn(() => reject(new DOMException('Cancelled', 'AbortError')));
  const analyse = vi.fn((_s: Blob, _p: object, _f: object, onProgress: typeof progress) => {
    progress = onProgress;
    return {
      result: new Promise<DoneMessage>((_resolve, fail) => {
        reject = fail;
      }),
      cancel,
      session: { segmentPage: vi.fn(), exportSegment: vi.fn() },
    };
  });
  return {
    analyse,
    cancel,
    fail: (error: Error) => reject(error),
    progress: (p: ProgressMessage) => progress(p),
  };
}

const props = {
  label: 'orders.csv',
  load: () =>
    Promise.resolve({
      source: new Blob(['x']),
      plan: {
        mapping: { orderId: 0, email: 1, orderedAt: 2, amount: 3 },
        read: { decimal: '.' as const, dateOrder: 'dmy' as const },
        amountLevel: 'order' as const,
      },
      format: {},
    }),
  onStartOver: () => {},
};

describe('ResultsScreen', () => {
  // Regression: cancelling rejected the job, and that rejection was shown as an error.
  it('says the analysis was cancelled, not that something went wrong', async () => {
    const fake = fakeAnalysis();
    render(<ResultsScreen {...props} analyse={fake.analyse} />);
    await act(async () => {});
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' })));
    expect(fake.cancel).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toContain('Analysis cancelled');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a real failure as an error', async () => {
    const fake = fakeAnalysis();
    render(<ResultsScreen {...props} analyse={fake.analyse} />);
    await act(async () => {});
    await act(async () =>
      fake.fail(new Error('Scores need at least 5 customers; this data has 1.')),
    );
    expect(screen.getByRole('alert').textContent).toContain('at least 5 customers');
  });

  it('says the file is too large for the browser, with the rows reached (TRD §11)', async () => {
    const fake = fakeAnalysis();
    render(<ResultsScreen {...props} analyse={fake.analyse} />);
    await act(async () => {});
    act(() => fake.progress({ type: 'progress', rowsRead: 120_000, bytesRead: 1, customers: 9 }));
    await act(async () =>
      fake.fail(new WorkerJobError('Array buffer allocation failed', 'out-of-memory')),
    );
    const alert = screen.getByRole('alert').textContent;
    expect(alert).toContain('This file is too large for your browser');
    expect(alert).toContain('after 120,000 rows');
    expect(alert).not.toContain('Something went wrong');
  });
});
