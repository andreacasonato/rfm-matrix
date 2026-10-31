// @vitest-environment jsdom
import type { BinSizes, Breakpoints, Dimension } from '@rfm-matrix/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ThresholdChoice } from './choices';
import { ThresholdCard } from './ThresholdCard';

afterEach(cleanup);

let last: ThresholdChoice | undefined;
function Harness(props: {
  dimension: Dimension;
  initial: ThresholdChoice;
  quintiles?: Breakpoints;
  counts?: BinSizes;
}) {
  const [choice, setChoice] = useState(props.initial);
  return (
    <ThresholdCard
      {...props}
      choice={choice}
      onChange={(next) => {
        last = next;
        setChoice(next);
      }}
    />
  );
}
const input = (name: RegExp) => screen.getByRole('textbox', { name }) as HTMLInputElement;

describe('ThresholdCard (U5)', () => {
  it('shows what the app decided, in plain words, until the merchant sets their own', () => {
    render(
      <Harness
        dimension="m"
        initial={{ method: 'quantile', breaks: ['', '', '', ''] }}
        quintiles={[60, 120.5, 210, 412.75]}
        counts={[10, 20, 30, 40, 50]}
      />,
    );
    expect(input(/Monetary score 5/).value).toBe('412.75');
    expect(input(/Monetary score 5/).disabled).toBe(true);
    expect(screen.getByText('(over 412.75)')).toBeTruthy();
    expect(screen.getByText('(up to 60.00)')).toBeTruthy();
    // Counts read top-down from score 5.
    const counts = screen.getAllByRole('cell').filter((c) => c.dataset.scoreCount);
    expect(counts.map((c) => c.textContent)).toEqual(['50', '40', '30', '20', '10']);

    fireEvent.click(screen.getByLabelText('Set my own amounts'));
    expect(last).toEqual({ method: 'fixed', breaks: ['60', '120.5', '210', '412.75'] });
    expect(input(/Monetary score 5/).disabled).toBe(false);
  });

  it('edits the right threshold: M5 is the top one, R5 the first', () => {
    render(
      <Harness dimension="m" initial={{ method: 'fixed', breaks: ['60', '120', '210', '412'] }} />,
    );
    fireEvent.change(input(/Monetary score 5/), { target: { value: '500' } });
    expect(last?.breaks).toEqual(['60', '120', '210', '500']);
    fireEvent.change(input(/Monetary score 2/), { target: { value: '50' } });
    expect(last?.breaks).toEqual(['50', '120', '210', '500']);
    cleanup();

    render(
      <Harness dimension="r" initial={{ method: 'fixed', breaks: ['30', '60', '90', '180'] }} />,
    );
    expect(
      screen.getByRole('textbox', { name: 'Recency score 5: within how many days' }),
    ).toBeTruthy();
    fireEvent.change(input(/Recency score 5/), { target: { value: '14' } });
    expect(last?.breaks).toEqual(['14', '60', '90', '180']);
    expect(screen.queryByRole('textbox', { name: /Recency score 1/ })).toBeNull();
    expect(screen.getByText('(more than 180 days)')).toBeTruthy();
  });

  it('explains a problem in place and hides the ranges until it is fixed', () => {
    render(<Harness dimension="f" initial={{ method: 'fixed', breaks: ['1', '2', '3', '5'] }} />);
    expect(screen.getByText('(4 to 5 orders)')).toBeTruthy();
    fireEvent.change(input(/Frequency score 3/), { target: { value: '1' } });
    expect(screen.getByRole('alert').textContent).toBe(
      'Each number of orders must be higher than the one for the score below.',
    );
    expect(input(/Frequency score 3/).getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByText('(4 to 5 orders)')).toBeNull();
  });

  it('before an analysis, says the app will work quintiles out', () => {
    render(<Harness dimension="m" initial={{ method: 'quantile', breaks: ['', '', '', ''] }} />);
    expect(screen.getByText(/works these out from your customers/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
