import { describe, expect, it } from 'vitest';
import { aggregate, createAggregator } from './aggregate';
import type { OrderRow } from './index';

const row = (customerKey: string, orderId: string, day: string, amount: number): OrderRow => ({
  customerKey,
  orderId,
  orderedAt: new Date(`${day}T12:00:00Z`),
  amount,
});

describe('createAggregator', () => {
  it('counts a multi-line order once and sums its line amounts (TRD §8 rule 1)', () => {
    const agg = createAggregator();
    agg.add(row('a', '#1', '2026-01-05', 30));
    agg.add(row('a', '#1', '2026-01-05', 0));
    agg.add(row('a', '#1', '2026-01-05', 12.5));
    expect(agg.customers()).toEqual([
      {
        customerKey: 'a',
        orderCount: 1,
        monetary: 42.5,
        firstOrderAt: new Date('2026-01-05T12:00:00Z'),
        lastOrderAt: new Date('2026-01-05T12:00:00Z'),
      },
    ]);
  });

  it('tracks distinct orders, total and first/latest date per customer, in any row order', () => {
    const agg = createAggregator();
    agg.add(row('a', '#2', '2026-03-01', 20));
    agg.add(row('b', '#3', '2026-02-01', 5));
    agg.add(row('a', '#1', '2026-01-01', 10));
    agg.add(row('a', '#2', '2026-03-01', 1));
    const [a, b] = agg.customers();
    expect(a).toMatchObject({ customerKey: 'a', orderCount: 2, monetary: 31 });
    expect(a?.firstOrderAt).toEqual(new Date('2026-01-01T12:00:00Z'));
    expect(a?.lastOrderAt).toEqual(new Date('2026-03-01T12:00:00Z'));
    expect(b).toMatchObject({ customerKey: 'b', orderCount: 1, monetary: 5 });
    expect(agg.customerCount).toBe(2);
  });

  it('keeps negative amounts, so refunds reduce the total', () => {
    const agg = createAggregator();
    agg.add(row('a', '#1', '2026-01-01', 50));
    agg.add(row('a', '#1-r', '2026-01-02', -50));
    expect(agg.customers()[0]?.monetary).toBe(0);
  });

  it('returns no customers before any row is added', () => {
    expect(createAggregator().customers()).toEqual([]);
  });
});

describe('aggregate', () => {
  it('reduces an async stream of rows', async () => {
    async function* rows() {
      yield row('a', '#1', '2026-01-01', 10);
      yield row('a', '#2', '2026-01-02', 10);
    }
    const [a] = await aggregate(rows());
    expect(a).toMatchObject({ customerKey: 'a', orderCount: 2, monetary: 20 });
  });
});
