// Plain list of segment counts for the M2 tracer bullet. The styled grid replaces it in S5.
import type { SegmentsSummary } from '@rfm-matrix/core';

const count = (n: number) => n.toLocaleString('en-US');
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

export function SegmentList({ summary }: { summary: SegmentsSummary }) {
  return (
    <table>
      <caption>Customers by segment</caption>
      <thead>
        <tr>
          <th scope="col">Segment</th>
          <th scope="col">Customers</th>
          <th scope="col">Share of customers</th>
          <th scope="col">Share of revenue</th>
        </tr>
      </thead>
      <tbody>
        {summary.segments.map((segment) => (
          <tr key={segment.id} data-segment={segment.id}>
            <th scope="row">{segment.name}</th>
            <td data-customers={segment.customers}>{count(segment.customers)}</td>
            <td>{percent(segment.customerShare)}</td>
            <td>{percent(segment.revenueShare)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td data-total-customers={summary.totals.customers}>{count(summary.totals.customers)}</td>
          <td>100%</td>
          <td>100%</td>
        </tr>
      </tfoot>
    </table>
  );
}
