import { describe, expect, it } from 'vitest';
import type { AnalysisPlan, FileSummary } from '../analysis/protocol';
import { defaultCleaning } from './default-cleaning';

const summary: FileSummary = {
  profile: {
    groups: [
      { status: 'paid', day: 1, orders: 3 },
      { status: 'cancelled', day: 1, orders: 1 },
      { status: 'refunded', day: 1, orders: 1 },
    ],
    refunds: 0,
    latestDay: 1,
  },
  rowsRead: 5,
  rowsUsed: 5,
  customers: 3,
};

const plan = (mapping: AnalysisPlan['mapping']): AnalysisPlan => ({
  mapping,
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
});

describe('defaultCleaning (ADR-0013)', () => {
  it('leaves out the default statuses found in the file, gross, refunds subtracted', () => {
    expect(defaultCleaning(summary, plan({ status: 4 }))).toEqual({
      excludedStatuses: ['cancelled', 'refunded'],
      amountBasis: 'gross',
      subtractRefunds: true,
    });
  });

  it('excludes nothing by status when no status column is mapped', () => {
    expect(defaultCleaning(summary, plan({})).excludedStatuses).toEqual([]);
  });
});
