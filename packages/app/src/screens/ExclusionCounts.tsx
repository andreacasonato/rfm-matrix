// Live counts for the cleaning screen: how many orders the current choices keep and leave out.
import type { OrderCounts } from '@rfm-matrix/core';
import { Notice } from '../components/Notice';
import { plural } from './plural';

type Props = { counts: OrderCounts; unreadableRows: number };

export function ExclusionCounts({ counts, unreadableRows }: Props) {
  const total =
    counts.used +
    counts.status +
    counts.withoutDate +
    counts.afterAnalysisDate +
    counts.beforeWindow;
  const reasons: [number, string][] = [
    [counts.status, 'left out by status'],
    [counts.afterAnalysisDate, 'after the analysis date'],
    [counts.beforeWindow, 'before the window'],
    [counts.withoutDate, 'without a date'],
  ];
  return (
    <section
      data-testid="exclusion-counts"
      className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-6"
    >
      <p className="text-section font-semibold">{plural(counts.used, 'order')} will be analysed</p>
      <ul className="text-text-secondary">
        {reasons
          .filter(([n]) => n > 0)
          .map(([n, reason]) => (
            <li key={reason}>
              {n.toLocaleString('en-US')} {reason}
            </li>
          ))}
        {unreadableRows > 0 && <li>{plural(unreadableRows, 'row')} could not be read</li>}
      </ul>
      {total > 0 && counts.used < total / 2 && (
        <Notice tone="warning" title="More than half of the orders are left out">
          <p>Check the statuses and dates above before running the analysis.</p>
        </Notice>
      )}
    </section>
  );
}
