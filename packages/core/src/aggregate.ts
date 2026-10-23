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

type Totals = { orderIds: Set<string>; monetary: number; first: number; last: number };

export type Aggregator = {
  add(row: OrderRow): void;
  readonly customerCount: number;
  customers(): CustomerAggregate[];
};

export function createAggregator(): Aggregator {
  const byCustomer = new Map<string, Totals>();
  return {
    add(row) {
      const time = row.orderedAt.getTime();
      const totals = byCustomer.get(row.customerKey);
      if (!totals) {
        byCustomer.set(row.customerKey, {
          orderIds: new Set([row.orderId]),
          monetary: row.amount,
          first: time,
          last: time,
        });
        return;
      }
      totals.orderIds.add(row.orderId);
      totals.monetary += row.amount;
      if (time < totals.first) totals.first = time;
      if (time > totals.last) totals.last = time;
    },
    get customerCount() {
      return byCustomer.size;
    },
    customers() {
      return Array.from(byCustomer, ([customerKey, t]) => ({
        customerKey,
        orderCount: t.orderIds.size,
        monetary: t.monetary,
        firstOrderAt: new Date(t.first),
        lastOrderAt: new Date(t.last),
      }));
    },
  };
}

export async function aggregate(rows: AsyncIterable<OrderRow>): Promise<CustomerAggregate[]> {
  const aggregator = createAggregator();
  for await (const row of rows) aggregator.add(row);
  return aggregator.customers();
}
