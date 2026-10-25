// Hand-counted fixture for ADR-0013 (synthetic customers c1–c9). Expected results, worked out
// by hand for analysis date 2026-06-02, lookback 365 days (window starts 2025-06-02), default
// statuses, gross amounts, refunds subtracted:
//
//   orders (not refunds): #1 #2 #3 #4 #5 #6 #7 #8 #9 #10 #12 #13 #14 = 13
//   excluded by status:   #3 cancelled, #4 refunded, #8 pending, #9 test = 4
//   without a date:       #13 = 1
//   after analysis date:  #14 (2026-07-01) = 1
//   before the window:    #6 (2025-01-10) = 1
//   used:                 #1 #2 #5 #7 #10 #12 = 6
//   refunds applied:      R10, R11 = 2
//   customers scored:     c1 F2 M140, c2 F1 M25, c3 F1 M20, c5 F1 M50, c7 F1 M45 = 5
//   customers without an order: c4, c6, c8, c9 = 4
//   net instead of gross: c1 M115 (100 − 20 tax − 5 shipping − 10 refunded, + 50)
import type { OrderRow } from '../index';

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

type Extra = Partial<Pick<OrderRow, 'amount' | 'status' | 'refunded' | 'tax' | 'shipping'>>;
const row = (customerKey: string, orderId: string, date: string | null, extra: Extra = {}) =>
  ({ customerKey, orderId, ...(date ? { orderedAt: day(date) } : {}), ...extra }) as OrderRow;

export const cleaningRows: OrderRow[] = [
  row('c1', '#1', '2026-03-01', {
    status: 'paid',
    amount: 100,
    tax: 20,
    shipping: 5,
    refunded: 10,
  }),
  row('c1', '#1', null), // later product line: no date, no amount
  row('c1', '#2', '2026-05-01', { status: 'paid', amount: 50 }),
  row('c2', '#3', '2026-04-01', { status: 'cancelled', amount: 80 }),
  row('c2', '#4', '2026-04-02', { status: 'refunded', amount: 60 }),
  row('c2', '#5', '2026-04-03', { status: 'partially_refunded', amount: 40, refunded: 15 }),
  row('c3', '#6', '2025-01-10', { status: 'paid', amount: 30 }),
  row('c3', '#7', '2026-06-01', { status: 'paid', amount: 20 }),
  row('c4', '#8', '2026-02-01', { status: 'pending', amount: 25 }),
  row('c4', '#9', '2026-02-02', { status: 'Test', amount: 1 }),
  row('c5', '#10', '2026-01-15', { status: 'paid', amount: 70 }),
  row('c5', 'R10', '2026-01-20', { amount: -20 }),
  row('c6', 'R11', '2026-03-03', { amount: -30 }),
  row('c7', '#12', '2026-05-05', { amount: 45 }),
  row('c8', '#13', null, { status: 'paid', amount: 10 }),
  row('c9', '#14', '2026-07-01', { status: 'paid', amount: 35 }),
];

export const cleaningRules = {
  analysisDate: new Date('2026-06-02T00:00:00Z'),
  lookbackDays: 365,
  amountBasis: 'gross',
  subtractRefunds: true,
} as const;
