// Segment counts as a table until the heatmap grid arrives in S5. Numbers are right-aligned
// in Geist Mono, the brief's rule for numeric table columns.
import type { SegmentsSummary } from '@rfm-matrix/core';

const count = (n: number) => n.toLocaleString('en-US');
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

const number = 'px-3 py-2 text-right font-mono text-number';
const heading = 'px-3 py-2 font-semibold';

export function SegmentList({ summary }: { summary: SegmentsSummary }) {
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-surface">
      <table className="w-full border-collapse text-left">
        <caption className="px-3 pt-3 text-left text-section font-semibold">
          Customers by segment
        </caption>
        <thead>
          <tr className="border-b border-border text-text-secondary">
            <th scope="col" className={heading}>
              Segment
            </th>
            <th scope="col" className={`${heading} text-right`}>
              Customers
            </th>
            <th scope="col" className={`${heading} text-right`}>
              Share of customers
            </th>
            <th scope="col" className={`${heading} text-right`}>
              Share of revenue
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.segments.map((segment) => (
            <tr key={segment.id} data-segment={segment.id} className="border-b border-border">
              <th scope="row" className="px-3 py-2 font-normal">
                {segment.name}
              </th>
              <td className={number} data-customers={segment.customers}>
                {count(segment.customers)}
              </td>
              <td className={number}>{percent(segment.customerShare)}</td>
              <td className={number}>{percent(segment.revenueShare)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" className={heading}>
              Total
            </th>
            <td className={number} data-total-customers={summary.totals.customers}>
              {count(summary.totals.customers)}
            </td>
            <td className={number}>100%</td>
            <td className={number}>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
