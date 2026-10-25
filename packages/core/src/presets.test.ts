import { describe, expect, it } from 'vitest';
import { detectPreset, guessMapping, presets, validateMapping } from './presets';

// Header rows only: synthetic, built from each platform's documented or common column names.
const shopify =
  'Name,Email,Financial Status,Paid at,Fulfillment Status,Fulfilled at,Accepts Marketing,Currency,Subtotal,Shipping,Taxes,Total,Discount Code,Discount Amount,Shipping Method,Created at,Lineitem quantity,Lineitem name,Lineitem price,Lineitem sku,Billing Name,Billing City,Billing Country,Notes,Cancelled at,Payment Method,Refunded Amount,Vendor,Id,Tags,Source,Phone'.split(
    ',',
  );
const wooSnake =
  'order_id,order_number,order_date,status,shipping_total,tax_total,discount_total,order_total,refunded_total,order_currency,payment_method,customer_id,billing_first_name,billing_last_name,billing_email,billing_phone,line_items'.split(
    ',',
  );
const wooTitled =
  'Order Number,Order Status,Order Date,Customer Note,First Name (Billing),Last Name (Billing),Email (Billing),Phone (Billing),Customer User ID,Order Total Amount,Order Shipping Amount'.split(
    ',',
  );
const generic = ['Customer ID', 'Order No', 'Date', 'Amount', 'Status'];

const at = (header: string[], name: string) => header.indexOf(name);

describe('presets', () => {
  it('ships Shopify, WooCommerce (unverified) and Other', () => {
    expect(presets.map((p) => [p.id, p.verified])).toEqual([
      ['shopify', true],
      ['woocommerce', false],
      ['other', false],
    ]);
  });

  it.each([
    ['Shopify', shopify, 'shopify'],
    ['WooCommerce (snake_case)', wooSnake, 'woocommerce'],
    ['WooCommerce (titled)', wooTitled, 'woocommerce'],
    ['a generic file', generic, 'other'],
  ])('recognises %s', (_label, header, id) => {
    expect(detectPreset(header)).toBe(id);
  });

  it('maps the Shopify sample: email as customer, Name as order ID (S2 proof)', () => {
    expect(guessMapping(shopify, 'shopify')).toEqual({
      email: at(shopify, 'Email'),
      orderId: at(shopify, 'Name'),
      orderedAt: at(shopify, 'Created at'),
      amount: at(shopify, 'Total'),
      status: at(shopify, 'Financial Status'),
      refunded: at(shopify, 'Refunded Amount'),
      tax: at(shopify, 'Taxes'),
      shipping: at(shopify, 'Shipping'),
    });
  });

  it('maps both WooCommerce samples, with customer ID and billing email', () => {
    expect(guessMapping(wooSnake, 'woocommerce')).toEqual({
      customerId: at(wooSnake, 'customer_id'),
      email: at(wooSnake, 'billing_email'),
      orderId: at(wooSnake, 'order_number'),
      orderedAt: at(wooSnake, 'order_date'),
      amount: at(wooSnake, 'order_total'),
      status: at(wooSnake, 'status'),
      refunded: at(wooSnake, 'refunded_total'),
      tax: at(wooSnake, 'tax_total'),
      shipping: at(wooSnake, 'shipping_total'),
    });
    expect(guessMapping(wooTitled, 'woocommerce')).toEqual({
      customerId: at(wooTitled, 'Customer User ID'),
      email: at(wooTitled, 'Email (Billing)'),
      orderId: at(wooTitled, 'Order Number'),
      orderedAt: at(wooTitled, 'Order Date'),
      amount: at(wooTitled, 'Order Total Amount'),
      status: at(wooTitled, 'Order Status'),
      shipping: at(wooTitled, 'Order Shipping Amount'),
    });
  });

  it('maps a generic file by common names, ignoring case and spacing', () => {
    expect(guessMapping(['customer_id', ' ORDER NO ', 'date', 'AMOUNT'], 'other')).toEqual({
      customerId: 0,
      orderId: 1,
      orderedAt: 2,
      amount: 3,
    });
  });

  it('never maps one column to two fields', () => {
    const mapping = guessMapping(['Order', 'Total'], 'other');
    const used = Object.values(mapping);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe('validateMapping', () => {
  const header = ['Email', 'Name', 'Created at', 'Total'];

  it('accepts a complete mapping', () => {
    expect(validateMapping({ email: 0, orderId: 1, orderedAt: 2, amount: 3 }, header)).toEqual([]);
  });

  it('names every missing required field', () => {
    expect(validateMapping({ orderId: 1 }, header)).toEqual([
      'Choose the column with the customer ID or the email.',
      'Choose the column with the order date.',
      'Choose the column with the order amount.',
    ]);
  });

  it('refuses one column for two fields', () => {
    expect(validateMapping({ email: 0, orderId: 3, orderedAt: 2, amount: 3 }, header)).toEqual([
      '"Total" is chosen for both Order ID and Amount.',
    ]);
  });

  it('refuses a column that is not in the file', () => {
    expect(validateMapping({ email: 0, orderId: 1, orderedAt: 2, amount: 9 }, header)).toEqual([
      'Amount points to a column that is not in this file.',
    ]);
  });
});
