import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { defaultExcludedStatuses, orderCounts } from './cleaning';
import { cleaningRows, cleaningRules } from './fixtures/cleaning-orders';
import type { OrderRow } from './index';
import { OrderBook } from './orders';

const row = (customerKey: string, orderId: string, date: string, amount?: number): OrderRow => ({
  customerKey,
  orderId,
  orderedAt: new Date(`${date}T12:00:00Z`),
  ...(amount === undefined ? {} : { amount }),
});

const keepAll = { excludedStatuses: [], amountBasis: 'gross', subtractRefunds: true } as const;

function book(rows: OrderRow[], amountLevel: 'order' | 'line' = 'order') {
  const b = new OrderBook({ amountLevel });
  for (const r of rows) b.add(r);
  return b;
}

describe('OrderBook grouping (TRD §8 rules 1, 3, 4; ADR-0012)', () => {
  it('counts a multi-line order once and, for product lines, sums their amounts', () => {
    const rows = [row('a', '#1', '2026-01-05', 30), row('a', '#1', '2026-01-05', 12.5)];
    expect(book(rows, 'line').finish(keepAll).customers).toEqual([
      {
        customerKey: 'a',
        orderCount: 1,
        monetary: 42.5,
        firstOrderAt: new Date('2026-01-05T12:00:00Z'),
        lastOrderAt: new Date('2026-01-05T12:00:00Z'),
      },
    ]);
  });

  it('by default takes one total per order: its first non-empty amount', () => {
    const rows = [
      row('a', '#1', '2026-01-05'),
      row('a', '#1', '2026-01-05', 30),
      row('a', '#1', '2026-01-05', 30),
      row('a', '#2', '2026-01-06', 0),
      row('a', '#2', '2026-01-06', 99),
    ];
    expect(book(rows).finish(keepAll).customers[0]).toMatchObject({ orderCount: 2, monetary: 30 });
  });

  it('tracks first and latest order dates in any row order', () => {
    const rows = [row('a', '#2', '2026-03-01', 20), row('a', '#1', '2026-01-01', 10)];
    const [a] = book(rows).finish(keepAll).customers;
    expect(a?.firstOrderAt).toEqual(new Date('2026-01-01T12:00:00Z'));
    expect(a?.lastOrderAt).toEqual(new Date('2026-03-01T12:00:00Z'));
  });

  it('takes an order date from whichever of its rows has one', () => {
    const undated: OrderRow = { customerKey: 'a', orderId: '#1', amount: 5 };
    const [a] = book([undated, row('a', '#1', '2026-01-05')]).finish(keepAll).customers;
    expect(a).toMatchObject({ orderCount: 1, monetary: 5 });
  });

  it('defaults the analysis date to the day after the latest order', () => {
    const result = book([row('a', '#1', '2026-01-05', 1)]).finish(keepAll);
    expect(result.analysisDate).toEqual(new Date('2026-01-06T00:00:00Z'));
  });
});

describe('OrderBook cleaning: the hand-counted fixture (ADR-0013)', () => {
  const rules = {
    ...cleaningRules,
    excludedStatuses: defaultExcludedStatuses([
      'paid',
      'cancelled',
      'refunded',
      'partially_refunded',
      'pending',
      'Test',
    ]),
  };
  const result = book(cleaningRows).finish(rules);

  it('excludes by status, missing date, analysis date and window, as counted by hand', () => {
    expect(result.counts).toEqual({
      used: 6,
      status: 4,
      withoutDate: 1,
      afterAnalysisDate: 1,
      beforeWindow: 1,
      refundsApplied: 2,
      customersWithoutOrders: 4,
    });
  });

  it('gives each remaining customer the hand-counted F and M', () => {
    const fm = Object.fromEntries(
      result.customers.map((c) => [c.customerKey, [c.orderCount, c.monetary]]),
    );
    expect(fm).toEqual({ c1: [2, 140], c2: [1, 25], c3: [1, 20], c5: [1, 50], c7: [1, 45] });
  });

  it('does not let a refund move a customer’s latest order date', () => {
    const c5 = result.customers.find((c) => c.customerKey === 'c5');
    expect(c5?.lastOrderAt).toEqual(new Date('2026-01-15T12:00:00Z'));
  });

  it('subtracts tax and shipping for net amounts', () => {
    const net = book(cleaningRows).finish({ ...rules, amountBasis: 'net' });
    expect(net.customers.find((c) => c.customerKey === 'c1')?.monetary).toBe(115);
  });

  it('leaves refunds out when "Subtract refunds" is off', () => {
    const gross = book(cleaningRows).finish({ ...rules, subtractRefunds: false });
    const m = Object.fromEntries(gross.customers.map((c) => [c.customerKey, c.monetary]));
    expect(m).toMatchObject({ c1: 150, c2: 40, c5: 70 });
    expect(gross.counts.refundsApplied).toBe(0);
  });

  it('gives the cleaning screen the same order counts from its summary', () => {
    const { refundsApplied: _r, customersWithoutOrders: _c, ...orders } = result.counts;
    expect(orderCounts(book(cleaningRows).profile(), rules)).toEqual(orders);
  });
});

describe('OrderBook (properties)', () => {
  const rows = fc.array(
    fc.record({
      customer: fc.constantFrom('a', 'b', 'c', 'd'),
      order: fc.integer({ min: 1, max: 12 }),
      day: fc.option(fc.integer({ min: 0, max: 800 }), { nil: undefined }),
      amount: fc.option(fc.integer({ min: -50, max: 200 }), { nil: undefined }),
      status: fc.constantFrom('paid', 'cancelled', 'refunded', ''),
    }),
    { maxLength: 60 },
  );
  const rules = fc.record({
    excludedStatuses: fc.subarray(['paid', 'cancelled', 'refunded', '']),
    lookbackDays: fc.option(fc.integer({ min: 1, max: 900 }), { nil: undefined }),
    analysisDay: fc.option(fc.integer({ min: 0, max: 900 }), { nil: undefined }),
  });

  it('counts every order exactly once, and matches the summary counts', () => {
    fc.assert(
      fc.property(rows, rules, (generated, r) => {
        const b = new OrderBook({ amountLevel: 'order' });
        for (const g of generated) {
          b.add({
            customerKey: g.customer,
            orderId: String(g.order),
            ...(g.day === undefined ? {} : { orderedAt: new Date(Date.UTC(2024, 0, 1 + g.day)) }),
            ...(g.amount === undefined ? {} : { amount: g.amount }),
            ...(g.status ? { status: g.status } : {}),
          });
        }
        const cleaning = {
          excludedStatuses: r.excludedStatuses,
          amountBasis: 'gross' as const,
          subtractRefunds: true,
          ...(r.lookbackDays === undefined ? {} : { lookbackDays: r.lookbackDays }),
          ...(r.analysisDay === undefined
            ? {}
            : { analysisDate: new Date(Date.UTC(2024, 0, 1 + r.analysisDay)) }),
        };
        const { counts, customers } = b.finish(cleaning);
        const profile = b.profile();
        const purchases = profile.groups.reduce((n, g) => n + g.orders, 0);
        const { refundsApplied: _r, customersWithoutOrders: _c, ...orders } = counts;
        expect(
          orders.used +
            orders.status +
            orders.withoutDate +
            orders.afterAnalysisDate +
            orders.beforeWindow,
        ).toBe(purchases);
        expect(orderCounts(profile, cleaning)).toEqual(orders);
        expect(customers.reduce((n, c) => n + c.orderCount, 0)).toBe(orders.used);
      }),
    );
  });
});
