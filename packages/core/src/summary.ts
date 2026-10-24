// Customer count and revenue per segment, for the grid (PRD story 5).
import type { CustomerScore } from './index';
import type { SegmentMap } from './segments';

export type SegmentSummary = {
  id: string;
  name: string;
  customers: number;
  revenue: number;
  customerShare: number;
  revenueShare: number;
};

export type SegmentsSummary = {
  segments: SegmentSummary[];
  totals: { customers: number; revenue: number };
};

const share = (part: number, whole: number) => (whole === 0 ? 0 : part / whole);

export function summariseSegments(customers: CustomerScore[], map: SegmentMap): SegmentsSummary {
  const counts = new Map<string, { customers: number; revenue: number }>();
  let revenue = 0;
  for (const c of customers) {
    const entry = counts.get(c.segmentId) ?? { customers: 0, revenue: 0 };
    entry.customers++;
    entry.revenue += c.monetary;
    counts.set(c.segmentId, entry);
    revenue += c.monetary;
  }
  const segments = [...map.segments]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((segment) => {
      const entry = counts.get(segment.id) ?? { customers: 0, revenue: 0 };
      return {
        id: segment.id,
        name: segment.name,
        customers: entry.customers,
        revenue: entry.revenue,
        customerShare: share(entry.customers, customers.length),
        revenueShare: share(entry.revenue, revenue),
      };
    });
  return { segments, totals: { customers: customers.length, revenue } };
}
