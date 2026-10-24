// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DoneMessage } from '../analysis/protocol';
import { ResultsScreen } from './ResultsScreen';
import { shopifyColumns } from './shopify-columns';

afterEach(cleanup);

function fakeAnalysis() {
  let reject: (error: Error) => void = () => {};
  const cancel = vi.fn(() => reject(new DOMException('Cancelled', 'AbortError')));
  const analyse = vi.fn(() => ({
    result: new Promise<DoneMessage>((_resolve, fail) => {
      reject = fail;
    }),
    cancel,
  }));
  return { analyse, cancel, fail: (error: Error) => reject(error) };
}

const props = {
  label: 'orders.csv',
  load: () => Promise.resolve(new Blob(['x'])),
  format: {},
  columns: shopifyColumns,
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
});
