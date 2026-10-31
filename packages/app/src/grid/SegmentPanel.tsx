// The segment list beside the grid: family pill, count, share of customers, revenue bar.
// Customers, Share and Revenue sort when clicked; Segment returns to the map's order.
import type { SegmentsSummary } from '@rfm-matrix/core';
import { useState } from 'react';
import { familyOf } from './families';
import { SortHeader } from './SortHeader';
import { nextSort, type SegmentSort, sortSegments } from './segment-sort';

const count = (n: number) => n.toLocaleString('en-US');
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;
const number = 'px-0.5 py-2 text-right font-mono text-number sm:px-2';

type Props = { summary: SegmentsSummary; onOpen?(segmentId: string): void };

export function SegmentPanel({ summary, onOpen }: Props) {
  // Bars are drawn relative to the largest share so small segments stay visible; the exact
  // share is printed beside each bar.
  const largest = Math.max(0, ...summary.segments.map((s) => s.revenueShare));
  const [sort, setSort] = useState<SegmentSort>({ key: 'segment' });
  const header = { sort, onSort: (column: SegmentSort['key']) => setSort(nextSort(sort, column)) };
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-surface p-3 sm:p-4">
      <table className="w-full border-collapse text-left">
        <caption className="pb-2 text-left text-section font-semibold">Segments</caption>
        <thead>
          <tr className="border-b border-border text-small text-text-secondary">
            <SortHeader column="segment" {...header}>
              Segment
            </SortHeader>
            <th scope="col" className="hidden px-2 py-2 font-normal sm:table-cell">
              <span className="sr-only">Family</span>
            </th>
            <SortHeader column="customers" align="right" {...header}>
              Customers
            </SortHeader>
            <SortHeader column="share" align="right" {...header}>
              Share
            </SortHeader>
            <SortHeader column="revenue" {...header}>
              Revenue
            </SortHeader>
          </tr>
        </thead>
        <tbody>
          {sortSegments(summary.segments, sort).map((segment) => {
            const family = familyOf(segment.id);
            const bar = largest > 0 ? (Math.max(0, segment.revenueShare) / largest) * 100 : 0;
            return (
              <tr key={segment.id} data-segment={segment.id} className="border-b border-border">
                <th scope="row" className="px-1 py-2 font-normal sm:px-2">
                  {onOpen ? (
                    <button
                      type="button"
                      aria-label={`Open ${segment.name}`}
                      onClick={() => onOpen(segment.id)}
                      className="rounded-control text-left underline-offset-4 enabled:hover:text-action-text enabled:hover:underline"
                    >
                      {segment.name}
                    </button>
                  ) : (
                    segment.name
                  )}
                </th>
                <td className="hidden px-2 py-2 sm:table-cell">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-small ${family.pill}`}
                  >
                    {family.name}
                  </span>
                </td>
                <td className={number} data-customers={segment.customers}>
                  {count(segment.customers)}
                </td>
                <td className={number}>{percent(segment.customerShare)}</td>
                <td className="px-1 py-2 sm:min-w-20 sm:px-2">
                  <div className="flex items-center gap-2">
                    {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot be drawn with the theme tokens in every browser */}
                    <div
                      role="meter"
                      aria-label={`${segment.name} share of revenue`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={segment.revenueShare * 100}
                      className="hidden h-2 flex-1 rounded-full bg-canvas sm:block"
                    >
                      <div className="h-2 rounded-full bg-heat-5" style={{ width: `${bar}%` }} />
                    </div>
                    <span className="font-mono text-number">{percent(segment.revenueShare)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" className="px-1 py-2 sm:px-2">
              Total
            </th>
            <td className="hidden sm:table-cell" />
            <td className={number} data-total-customers={summary.totals.customers}>
              {count(summary.totals.customers)}
            </td>
            <td className={number}>100%</td>
            <td className="px-1 py-2 font-mono text-number sm:px-2">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
