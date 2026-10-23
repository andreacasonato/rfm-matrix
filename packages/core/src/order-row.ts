// Turns one parsed row of cells into an OrderRow, given which column holds which field.
// Column presets and date formats other than ISO 8601 arrive with slice S2.
import type { OrderRow } from './index';

export type ColumnIndexes = {
  customer: number;
  orderId: number;
  orderedAt: number;
  amount: number;
};

export function toOrderRow(cells: string[], columns: ColumnIndexes): OrderRow | undefined {
  const customerKey = cells[columns.customer]?.trim();
  const orderId = cells[columns.orderId]?.trim();
  const dateText = cells[columns.orderedAt]?.trim();
  const amountText = cells[columns.amount]?.trim();
  if (!customerKey || !orderId || !dateText || amountText === undefined) return undefined;

  const time = Date.parse(dateText);
  const amount = amountText === '' ? 0 : Number(amountText);
  if (Number.isNaN(time) || !Number.isFinite(amount)) return undefined;

  return { customerKey, orderId, orderedAt: new Date(time), amount };
}
