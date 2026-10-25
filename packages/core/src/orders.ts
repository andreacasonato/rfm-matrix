// Groups rows into orders per customer while a file is read, then applies the cleaning rules
// to whole orders (TRD §8 rules 1, 3, 4; ADR-0012; ADR-0013). Only one small record per order
// is kept, never the rows themselves.
import {
  analysisDayFor,
  type CleaningCounts,
  type CleaningRules,
  classifyOrder,
  dayMs,
  normaliseStatus,
  type OrderProfile,
  utcDay,
} from './cleaning';
import type { OrderRow } from './index';
import { OrderColumns, type ValueField, valueFields } from './order-columns';

export type CustomerAggregate = {
  customerKey: string;
  orderCount: number;
  monetary: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
};

/** `order`: first non-empty value per order; `line`: add up every row (ADR-0012). */
export type AmountLevel = 'order' | 'line';

export type OrderBookResult = {
  customers: CustomerAggregate[];
  counts: CleaningCounts;
  analysisDate: Date | undefined;
};

export class OrderBook {
  private readonly orderIndex = new Map<string, number>();
  private readonly customerIndex = new Map<string, number>();
  private readonly customerKeys: string[] = [];
  private readonly statusIndex = new Map<string, number>();
  private readonly statuses: string[] = [];
  private readonly columns = new OrderColumns();
  private readonly amountLevel: AmountLevel;

  constructor({ amountLevel = 'order' }: { amountLevel?: AmountLevel } = {}) {
    this.amountLevel = amountLevel;
  }

  get customerCount(): number {
    return this.customerKeys.length;
  }

  add(row: OrderRow): void {
    let customer = this.customerIndex.get(row.customerKey);
    if (customer === undefined) {
      customer = this.customerKeys.push(row.customerKey) - 1;
      this.customerIndex.set(row.customerKey, customer);
    }
    const key = `${customer}\u0000${row.orderId}`;
    let i = this.orderIndex.get(key);
    if (i === undefined) {
      i = this.columns.push(customer);
      this.orderIndex.set(key, i);
    }
    const c = this.columns;
    if (Number.isNaN(c.time[i] ?? 0) && row.orderedAt) c.time[i] = row.orderedAt.getTime();
    if (c.status[i] === -1 && row.status) c.status[i] = this.statusId(normaliseStatus(row.status));
    for (const field of valueFields) {
      const v = row[field];
      if (v === undefined) continue;
      const values = c.values[field];
      const current = values[i] ?? Number.NaN;
      if (Number.isNaN(current)) values[i] = v;
      else if (this.amountLevel === 'line') values[i] = current + v;
    }
  }

  private statusId(status: string): number {
    let id = this.statusIndex.get(status);
    if (id === undefined) {
      id = this.statuses.push(status) - 1;
      this.statusIndex.set(status, id);
    }
    return id;
  }

  private statusOf(i: number): string {
    const id = this.columns.status[i] ?? -1;
    return id === -1 ? '' : (this.statuses[id] ?? '');
  }

  // A negative amount is a refund written as its own order (ADR-0013 rule 3).
  private isRefund(i: number): boolean {
    return (this.columns.values.amount[i] ?? 0) < 0;
  }

  private dayOf(i: number): number | undefined {
    const time = this.columns.time[i] ?? Number.NaN;
    return Number.isNaN(time) ? undefined : utcDay(time);
  }

  private value(i: number, rules: CleaningRules): number {
    const v = (field: ValueField) => {
      const x = this.columns.values[field][i] ?? Number.NaN;
      return Number.isNaN(x) ? 0 : x;
    };
    let total = v('amount');
    if (rules.amountBasis === 'net') total -= v('tax') + v('shipping');
    if (rules.subtractRefunds) total -= v('refunded');
    return total;
  }

  private latestDay(): number | undefined {
    let latest: number | undefined;
    for (let i = 0; i < this.columns.size; i++) {
      const day = this.dayOf(i);
      if (day === undefined || this.isRefund(i)) continue;
      if (latest === undefined || day > latest) latest = day;
    }
    return latest;
  }

  /** Purchase counts by status and day, for the cleaning screen. */
  profile(): OrderProfile {
    const groups = new Map<string, { status: string; day: number | null; orders: number }>();
    let refunds = 0;
    for (let i = 0; i < this.columns.size; i++) {
      if (this.isRefund(i)) {
        refunds++;
        continue;
      }
      const status = this.statusOf(i);
      const day = this.dayOf(i) ?? null;
      const key = `${status}\u0000${day}`;
      const group = groups.get(key) ?? { status, day, orders: 0 };
      group.orders++;
      groups.set(key, group);
    }
    return { groups: [...groups.values()], refunds, latestDay: this.latestDay() };
  }

  finish(rules: CleaningRules): OrderBookResult {
    const analysisDay = analysisDayFor(rules, this.latestDay());
    const counts: CleaningCounts = {
      used: 0,
      status: 0,
      withoutDate: 0,
      afterAnalysisDate: 0,
      beforeWindow: 0,
      refundsApplied: 0,
      customersWithoutOrders: 0,
    };
    const n = this.customerKeys.length;
    const orderCount = new Int32Array(n);
    const monetary = new Float64Array(n);
    const first = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
    const last = new Float64Array(n).fill(Number.NEGATIVE_INFINITY);

    for (let i = 0; i < this.columns.size; i++) {
      const customer = this.columns.customer[i] ?? 0;
      const kind = classifyOrder(this.statusOf(i), this.dayOf(i), rules, analysisDay);
      if (this.isRefund(i)) {
        // Refunds reduce M inside the window but are not orders and do not move recency.
        if (rules.subtractRefunds && kind === 'used') {
          monetary[customer] = (monetary[customer] ?? 0) + this.value(i, rules);
          counts.refundsApplied++;
        }
        continue;
      }
      counts[kind]++;
      if (kind !== 'used') continue;
      const time = this.columns.time[i] ?? 0;
      orderCount[customer] = (orderCount[customer] ?? 0) + 1;
      monetary[customer] = (monetary[customer] ?? 0) + this.value(i, rules);
      first[customer] = Math.min(first[customer] ?? time, time);
      last[customer] = Math.max(last[customer] ?? time, time);
    }

    const customers: CustomerAggregate[] = [];
    for (let c = 0; c < n; c++) {
      if ((orderCount[c] ?? 0) === 0) {
        counts.customersWithoutOrders++;
        continue;
      }
      customers.push({
        customerKey: this.customerKeys[c] ?? '',
        orderCount: orderCount[c] ?? 0,
        monetary: monetary[c] ?? 0,
        firstOrderAt: new Date(first[c] ?? 0),
        lastOrderAt: new Date(last[c] ?? 0),
      });
    }
    const analysisDate = analysisDay === undefined ? undefined : new Date(analysisDay * dayMs);
    return { customers, counts, analysisDate };
  }
}
