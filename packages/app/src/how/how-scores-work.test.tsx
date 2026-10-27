// @vitest-environment jsdom
import { defaultScoring } from '@rfm-matrix/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HowScoresWork } from './HowScoresWork';

afterEach(cleanup);

const props = {
  scoring: defaultScoring,
  breakpoints: {
    r: [12.5, 40, 90, 200] as [number, number, number, number],
    f: [1, 2, 3, 5] as [number, number, number, number],
    m: [20, 45.5, 80, 150] as [number, number, number, number],
  },
  cellCustomers: Array.from({ length: 125 }, (_, i) => (i < 25 ? 2 : 1)),
  analysisDate: '2026-10-01',
};

describe('How scores work (APP_FLOW)', () => {
  it("shows each dimension's method, ranges and customers per score", () => {
    render(<HowScoresWork {...props} onBack={() => {}} />);
    const recency = screen.getByRole('table', { name: 'Recency scores' });
    const rows = within(recency)
      .getAllByRole('row')
      .slice(1)
      .map((r) => r.textContent);
    expect(rows[0]).toBe('5up to 12 days25');
    // R1 holds the first 25 cells, 2 customers each.
    expect(rows[4]).toBe('1more than 200 days50');
    expect(screen.getByRole('table', { name: 'Frequency scores' }).textContent).toContain(
      '4 to 5 orders',
    );
    expect(screen.getByRole('table', { name: 'Monetary scores' }).textContent).toContain(
      'over 45.50 up to 80.00',
    );
    expect(document.body.textContent).toContain('quintiles');
    expect(document.body.textContent).toContain('1 October 2026');
  });

  it('says what RFM cannot tell you', () => {
    render(<HowScoresWork {...props} onBack={() => {}} />);
    expect(document.body.textContent).toContain('describes the past');
  });

  it('goes back to the grid', () => {
    const onBack = vi.fn();
    render(<HowScoresWork {...props} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to grid' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
