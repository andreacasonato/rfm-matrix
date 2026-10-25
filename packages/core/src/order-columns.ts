// Storage behind OrderBook: one slot per order.

export type ValueField = 'amount' | 'tax' | 'shipping' | 'refunded';
export const valueFields: ValueField[] = ['amount', 'tax', 'shipping', 'refunded'];

/**
 * One slot per order in typed arrays: NaN means "no value", -1 "no status". Far smaller than an
 * object per order, which matters with hundreds of thousands of orders in a browser tab.
 */
export class OrderColumns {
  size = 0;
  customer = new Int32Array(1024);
  status = new Int32Array(1024);
  time = new Float64Array(1024);
  values: Record<ValueField, Float64Array> = {
    amount: new Float64Array(1024),
    tax: new Float64Array(1024),
    shipping: new Float64Array(1024),
    refunded: new Float64Array(1024),
  };

  push(customer: number): number {
    if (this.size === this.customer.length) this.grow();
    const i = this.size++;
    this.customer[i] = customer;
    this.status[i] = -1;
    this.time[i] = Number.NaN;
    for (const field of valueFields) this.values[field][i] = Number.NaN;
    return i;
  }

  private grow() {
    const next = this.customer.length * 2;
    const copy = <T extends Int32Array | Float64Array>(from: T, to: T) => {
      to.set(from);
      return to;
    };
    this.customer = copy(this.customer, new Int32Array(next));
    this.status = copy(this.status, new Int32Array(next));
    this.time = copy(this.time, new Float64Array(next));
    for (const field of valueFields) {
      this.values[field] = copy(this.values[field], new Float64Array(next));
    }
  }
}
