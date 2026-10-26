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

export type SegmentTotals = Map<string, { customers: number; revenue: number }>;

export function summariseSegments(customers: CustomerScore[], map: SegmentMap): SegmentsSummary {
  const counts: SegmentTotals = new Map();
  for (const c of customers) {
    const entry = counts.get(c.segmentId) ?? { customers: 0, revenue: 0 };
    entry.customers++;
    entry.revenue += c.monetary;
    counts.set(c.segmentId, entry);
  }
  return summariseTotals(counts, map);
}

/** The summary from totals already added up per segment, e.g. by the worker's table (S7). */
export function summariseTotals(counts: SegmentTotals, map: SegmentMap): SegmentsSummary {
  let customers = 0;
  let revenue = 0;
  for (const entry of counts.values()) {
    customers += entry.customers;
    revenue += entry.revenue;
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
        customerShare: share(entry.customers, customers),
        revenueShare: share(entry.revenue, revenue),
      };
    });
  return { segments, totals: { customers, revenue } };
}
