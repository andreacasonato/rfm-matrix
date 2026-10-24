// Shopify's order export column names. Temporary until slice S2 adds column mapping presets.
import type { ColumnNames } from '../analysis/protocol';

export const shopifyColumns: ColumnNames = {
  customer: 'Email',
  orderId: 'Name',
  orderedAt: 'Created at',
  amount: 'Total',
};

export const hasShopifyColumns = (header: string[]) =>
  Object.values(shopifyColumns).every((name) => header.some((cell) => cell.trim() === name));
