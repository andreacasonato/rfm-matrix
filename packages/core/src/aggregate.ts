// Reduces order rows to one record per customer as they arrive (TRD §4, §8 rules 1, 3, 4).
// Raw rows are not kept; only the order IDs needed to count each order once.
import type { OrderRow } from './index';

export type CustomerAggregate = {
  customerKey: string;
  orderCount: number;
  monetary: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
};

/**
 * How an order's amount is read from its rows (ADR-0012): `order` takes the first non-empty
 * amount of each order, `line` adds up every row's amount.
 */
export type AmountLevel = 'order' | 'line';

// Per order: whether its amount has been counted yet.
type Totals = { orders: Map<string, boolean>; monetary: number; first: number; last: number };

export type Aggregator = {
  /** Adds a row; false when it cannot be used (no date and the order is not known yet). */
  add(row: OrderRow): boolean;
  readonly customerCount: number;
  customers(): CustomerAggregate[];
};

export function createAggregator({
  amountLevel = 'order',
}: {
  amountLevel?: AmountLevel;
} = {}): Aggregator {
  const byCustomer = new Map<string, Totals>();
  return {
    add(row) {
      let totals = byCustomer.get(row.customerKey);
      const known = totals?.orders.has(row.orderId) ?? false;
      if (!row.orderedAt && !known) return false;

      if (row.orderedAt) {
        const time = row.orderedAt.getTime();
        if (!totals) {
          totals = { orders: new Map(), monetary: 0, first: time, last: time };
          byCustomer.set(row.customerKey, totals);
        }
        if (time < totals.first) totals.first = time;
        if (time > totals.last) totals.last = time;
      }
      if (!totals) return false;

      const counted = totals.orders.get(row.orderId) ?? false;
      if (row.amount !== undefined && (amountLevel === 'line' || !counted)) {
        totals.monetary += row.amount;
        totals.orders.set(row.orderId, true);
      } else if (!known) {
        totals.orders.set(row.orderId, false);
      }
      return true;
    },
    get customerCount() {
      return byCustomer.size;
    },
    customers() {
      return Array.from(byCustomer, ([customerKey, t]) => ({
        customerKey,
        orderCount: t.orders.size,
        monetary: t.monetary,
        firstOrderAt: new Date(t.first),
        lastOrderAt: new Date(t.last),
      }));
    },
  };
}

export async function aggregate(
  rows: AsyncIterable<OrderRow>,
  options: { amountLevel?: AmountLevel } = {},
): Promise<CustomerAggregate[]> {
  const aggregator = createAggregator(options);
  for await (const row of rows) aggregator.add(row);
  return aggregator.customers();
}
