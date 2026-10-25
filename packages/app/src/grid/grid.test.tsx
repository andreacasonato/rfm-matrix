// @vitest-environment jsdom
import {
  defaultSegmentMap,
  type GridCell,
  gridCells,
  type SegmentsSummary,
} from '@rfm-matrix/core';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { familyOf } from './families';
import { Heatmap } from './Heatmap';
import { heatStep } from './heat';
import { SegmentPanel } from './SegmentPanel';
import { StatTiles } from './StatTiles';

afterEach(cleanup);

describe('heatStep', () => {
  it.each([
    [0, 100, 0],
    [1, 100, 1],
    [20, 100, 1],
    [21, 100, 2],
    [60, 100, 3],
    [99, 100, 5],
    [100, 100, 5],
    [0, 0, 0],
  ])('%i of a largest cell of %i is step %i', (customers, max, step) => {
    expect(heatStep(customers, max)).toBe(step);
  });
});

describe('familyOf (DESIGN_BRIEF segment families)', () => {
  it.each([
    ['champions', 'Thriving'],
    ['loyal-customers', 'Thriving'],
    ['new-customers', 'Growing'],
    ['promising', 'Growing'],
    ['potential-loyalists', 'Growing'],
    ['need-attention', 'Slipping'],
    ['about-to-sleep', 'Slipping'],
    ['at-risk', 'At risk'],
    ['cant-lose-them', 'At risk'],
    ['hibernating', 'Gone'],
    ['lost', 'Gone'],
  ])('%s is %s', (id, family) => {
    expect(familyOf(id).name).toBe(family);
  });
});

const sampleCells = (): GridCell[] => {
  const cells = gridCells([], defaultSegmentMap);
  for (const [i, cell] of cells.entries()) cell.customers = i;
  return cells;
};

describe('Heatmap', () => {
  it('is a table with R rows and F columns, every cell naming its segment and count', () => {
    render(<Heatmap cells={sampleCells()} segments={defaultSegmentMap.segments} />);
    const table = screen.getByRole('table', { name: /customers by recency and frequency/i });
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((h) => h.textContent),
    ).toEqual(['R5', 'R4', 'R3', 'R2', 'R1']);
    const cells = within(table).getAllByRole('cell');
    expect(cells).toHaveLength(25);
    expect(cells[3]?.getAttribute('aria-label')).toBe('Champions, R5 F4: 3 customers');
    expect(cells[24]?.getAttribute('aria-label')).toBe("Can't lose them, R1 F5: 24 customers");
  });

  it('labels each segment once, on its first cell, so colour is never the only cue', () => {
    render(<Heatmap cells={sampleCells()} segments={defaultSegmentMap.segments} />);
    expect(screen.getAllByText('Champions')).toHaveLength(1);
    expect(screen.getAllByText('About to sleep')).toHaveLength(1);
  });
});

describe('StatTiles', () => {
  it('shows customers, revenue, repeat share and analysis date', () => {
    render(
      <StatTiles
        customers={540}
        revenue={144_557.14}
        repeatCustomers={254}
        analysisDate="2026-09-27"
      />,
    );
    const text = screen.getByRole('list', { name: 'Summary' }).textContent;
    expect(text).toContain('Customers540');
    expect(text).toContain('Revenue144,557');
    expect(text).toContain('Repeat customers47%');
    expect(text).toContain('Analysed27 September 2026');
  });
});

describe('SegmentPanel', () => {
  const summary: SegmentsSummary = {
    segments: defaultSegmentMap.segments.map((s, i) => ({
      id: s.id,
      name: s.name,
      customers: i,
      revenue: i * 10,
      customerShare: i / 55,
      revenueShare: (i * 10) / 550,
    })),
    totals: { customers: 55, revenue: 550 },
  };

  it('lists every segment with its family pill, count, shares and a revenue bar', () => {
    render(<SegmentPanel summary={summary} />);
    const row = screen.getByText('At risk', { selector: 'th' }).closest('tr');
    if (!row) throw new Error('no At risk row');
    expect(row.textContent).toContain('At risk');
    expect(row.getAttribute('data-segment')).toBe('at-risk');
    expect(within(row).getByRole('meter').getAttribute('aria-valuenow')).toBe(
      String(((7 * 10) / 550) * 100),
    );
  });
});
