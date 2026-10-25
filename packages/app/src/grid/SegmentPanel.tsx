// The segment list beside the grid: family pill, count, share of customers, revenue bar.
import type { SegmentsSummary } from '@rfm-matrix/core';
import { familyOf } from './families';

const count = (n: number) => n.toLocaleString('en-US');
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;
const number = 'px-1 py-2 text-right font-mono text-number sm:px-2';

type Props = { summary: SegmentsSummary; onOpen?(segmentId: string): void };

export function SegmentPanel({ summary, onOpen }: Props) {
  // Bars are drawn relative to the largest share so small segments stay visible; the exact
  // share is printed beside each bar.
  const largest = Math.max(0, ...summary.segments.map((s) => s.revenueShare));
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-surface p-4">
      <table className="w-full border-collapse text-left">
        <caption className="pb-2 text-left text-section font-semibold">Segments</caption>
        <thead>
          <tr className="border-b border-border text-small text-text-secondary">
            <th scope="col" className="px-2 py-2 font-normal">
              Segment
            </th>
            <th scope="col" className="hidden px-2 py-2 font-normal sm:table-cell">
              <span className="sr-only">Family</span>
            </th>
            <th scope="col" className="px-2 py-2 text-right font-normal">
              Customers
            </th>
            <th scope="col" className="px-2 py-2 text-right font-normal">
              Share
            </th>
            <th scope="col" className="px-2 py-2 font-normal">
              Revenue
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.segments.map((segment) => {
            const family = familyOf(segment.id);
            const bar = largest > 0 ? (Math.max(0, segment.revenueShare) / largest) * 100 : 0;
            return (
              <tr key={segment.id} data-segment={segment.id} className="border-b border-border">
                <th scope="row" className="px-2 py-2 font-normal">
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
                <td className="px-2 py-2 sm:min-w-28">
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
                      <div className="h-2 rounded-full bg-heat-4" style={{ width: `${bar}%` }} />
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
            <th scope="row" className="px-2 py-2">
              Total
            </th>
            <td className="hidden sm:table-cell" />
            <td className={number} data-total-customers={summary.totals.customers}>
              {count(summary.totals.customers)}
            </td>
            <td className={number}>100%</td>
            <td className="px-2 py-2 font-mono text-number">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
