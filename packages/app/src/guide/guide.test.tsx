// @vitest-environment jsdom
import { defaultSegmentMap } from '@rfm-matrix/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuideScreen } from './GuideScreen';

afterEach(cleanup);

describe('Guide (U4)', () => {
  it('explains RFM, scores, thresholds, segments, the steps and the limits', () => {
    render(<GuideScreen onBack={() => {}} />);
    const headings = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(headings).toEqual([
      'Guide',
      'What RFM is',
      'How scores work',
      'Choosing your own thresholds',
      'From scores to segments',
      'The 11 segments',
      'Using the app in five steps',
      'What RFM cannot tell you',
    ]);
  });

  it('lists every segment with the same meaning and action the app shows elsewhere', () => {
    render(<GuideScreen onBack={() => {}} />);
    const table = screen.getByRole('table', { name: 'The 11 segments' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(defaultSegmentMap.segments.length);
    for (const segment of defaultSegmentMap.segments) {
      // The row header holds the name, then its family pill.
      const name = new RegExp(`^${segment.name} `);
      const row = within(table).getByRole('rowheader', { name }).closest('tr');
      expect(row?.textContent).toContain(segment.description);
      expect(row?.textContent).toContain(segment.suggestedAction);
    }
  });

  it('goes back, and takes focus on opening so keyboard users land on it', () => {
    const onBack = vi.fn();
    render(<GuideScreen onBack={onBack} />);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Guide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
