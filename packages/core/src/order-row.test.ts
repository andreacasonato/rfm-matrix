import { describe, expect, it } from 'vitest';
import { toOrderRow } from './order-row';

const columns = { customer: 0, orderId: 1, orderedAt: 2, amount: 3 };

describe('toOrderRow', () => {
  it('reads trimmed values from the mapped columns', () => {
    expect(
      toOrderRow([' c1@example.test ', ' #1001', '2026-01-05T10:00:00Z', ' 19.90 '], columns),
    ).toEqual({
      customerKey: 'c1@example.test',
      orderId: '#1001',
      orderedAt: new Date('2026-01-05T10:00:00Z'),
      amount: 19.9,
    });
  });

  it('treats an empty amount as 0, as on later line rows of a Shopify order', () => {
    expect(toOrderRow(['c1', '#1', '2026-01-05', ''], columns)?.amount).toBe(0);
  });

  it.each([
    ['missing customer', ['', '#1', '2026-01-05', '1']],
    ['missing order ID', ['c1', ' ', '2026-01-05', '1']],
    ['unreadable date', ['c1', '#1', 'yesterday', '1']],
    ['unreadable amount', ['c1', '#1', '2026-01-05', '12,50 EUR']],
    ['too few cells', ['c1', '#1']],
  ])('rejects a row with %s', (_label, cells) => {
    expect(toOrderRow(cells, columns)).toBeUndefined();
  });
});
