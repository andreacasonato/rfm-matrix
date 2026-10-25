// Turns one parsed row of cells into an OrderRow through the user's column mapping (ADR-0012).
import type { OrderRow } from './index';
import type { ColumnMapping, Field } from './presets';
import { type DateOrder, type DecimalSeparator, parseAmount, parseDate } from './values';

export type ReadSettings = { decimal: DecimalSeparator; dateOrder: DateOrder };

/** The row, or undefined when it cannot be used: no customer, no order ID, bad date or amount. */
export function toOrderRow(
  cells: string[],
  mapping: ColumnMapping,
  settings: ReadSettings,
): OrderRow | undefined {
  const get = (field: Field) => {
    const index = mapping[field];
    return index === undefined ? undefined : cells[index]?.trim();
  };
  // SCHEMA.md: the customer ID when there is one, otherwise the lower-cased email.
  const customerKey = get('customerId') || get('email')?.toLowerCase();
  const orderId = get('orderId');
  const dateText = get('orderedAt');
  const amountText = get('amount');
  if (!customerKey || !orderId || dateText === undefined || amountText === undefined) {
    return undefined;
  }

  const row: OrderRow = { customerKey, orderId };
  if (dateText) {
    const time = parseDate(dateText, settings.dateOrder);
    if (Number.isNaN(time)) return undefined;
    row.orderedAt = new Date(time);
  }
  const amount = parseAmount(amountText, settings.decimal);
  if (Number.isNaN(amount)) return undefined;
  if (amount !== null) row.amount = amount;
  const status = get('status');
  if (status) row.status = status;
  // Optional order values (ADR-0013): empty cells are left out, unreadable ones make the row
  // unusable like an unreadable amount.
  for (const field of ['refunded', 'tax', 'shipping'] as const) {
    const text = get(field);
    if (!text) continue;
    const value = parseAmount(text, settings.decimal);
    if (value === null) continue;
    if (Number.isNaN(value)) return undefined;
    row[field] = value;
  }
  return row;
}
