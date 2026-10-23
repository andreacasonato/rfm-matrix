// Synthetic Shopify-style order export for benchmarks. Every value is generated from a seed;
// names and places are placeholders, never real people (AGENTS.md).

export type Expected = {
  rows: number;
  unusableRows: number;
  customers: number;
  orders: number;
  totalCents: number;
};

const header = [
  'Name',
  'Email',
  'Financial Status',
  'Paid at',
  'Fulfillment Status',
  'Accepts Marketing',
  'Currency',
  'Subtotal',
  'Shipping',
  'Taxes',
  'Total',
  'Discount Code',
  'Created at',
  'Lineitem quantity',
  'Lineitem name',
  'Lineitem price',
  'Lineitem sku',
  'Billing Name',
  'Billing Address1',
  'Billing City',
  'Billing Zip',
  'Billing Country',
  'Shipping Address1',
  'Shipping City',
  'Shipping Method',
  'Payment Method',
  'Vendor',
  'Notes',
];
const products = [
  'Mug, large',
  'Tea "Breakfast" blend',
  'Coffee beans 1kg',
  'Café filter',
  'Gift card',
];
const cities = ['Springfield', 'Riverton', 'Lakeside', 'Hillview', 'Ōtaki', 'Zürichsee'];
const statuses = ['paid', 'paid', 'paid', 'paid', 'refunded', 'partially_refunded'];
const start = Date.UTC(2024, 9, 1);
const span = Date.UTC(2026, 8, 30) - start;

function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quote = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
const money = (cents: number) => (cents / 100).toFixed(2);

export function writeSyntheticOrders(
  rows: number,
  seed: number,
  write: (chunk: string) => void,
): Expected {
  const next = random(seed);
  const pick = <T>(list: T[]) => list[Math.floor(next() * list.length)] as T;
  const customers = new Set<number>();
  let customerCount = 0;
  let written = 0;
  let unusableRows = 0;
  let orders = 0;
  let totalCents = 0;
  let buffer = `${header.join(',')}\n`;

  for (let order = 1001; written < rows; order++) {
    const isNew = customerCount === 0 || next() < 0.5;
    const customer = isNew ? customerCount++ : Math.floor(customerCount * next() ** 2);
    const email = next() < 0.002 ? '' : `c${String(customer).padStart(7, '0')}@example.test`;
    const progress = (order - 1001) / (rows / 1.65);
    const created = new Date(start + Math.min(1, progress) * span + next() * 3_600_000);
    const createdText = `${created.toISOString().slice(0, 19)}Z`;
    const roll = next();
    const lineCount =
      roll < 0.6 ? 1 : roll < 0.85 ? 2 : roll < 0.95 ? 3 : 4 + Math.floor(next() * 3);
    const lines = Array.from({ length: lineCount }, () => ({
      quantity: 1 + Math.floor(next() * 3),
      price: 500 + Math.floor(next() * 7500),
      product: pick(products),
    }));
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
    const shipping = subtotal > 5000 ? 0 : 495;
    const total = subtotal + shipping;
    const city = pick(cities);
    const street = `${1 + (customer % 240)} Example Street`;
    const status = pick(statuses);

    for (let i = 0; i < lineCount && written < rows; i++) {
      const line = lines[i];
      if (!line) break;
      const first = i === 0;
      const cells = [
        `#${order}`,
        email,
        first ? status : '',
        first ? createdText : '',
        first ? 'fulfilled' : '',
        first ? 'yes' : '',
        'EUR',
        first ? money(subtotal) : '',
        first ? money(shipping) : '',
        first ? money(Math.round(subtotal * 0.2)) : '',
        first ? money(total) : '',
        first && next() < 0.1 ? 'WELCOME10' : '',
        createdText,
        String(line.quantity),
        line.product,
        money(line.price),
        `SKU-${Math.floor(next() * 90000) + 10000}`,
        `Customer ${String(customer).padStart(7, '0')}`,
        street,
        city,
        String(10000 + (customer % 89999)),
        'Testland',
        street,
        city,
        'Standard shipping (3-5 days)',
        'Card payment',
        'Synthetic Goods',
        first && next() < 0.3 ? 'Leave at door, please' : 'Synthetic benchmark row',
      ];
      buffer += `${cells.map(quote).join(',')}\n`;
      written++;
      if (!email) unusableRows++;
      if (buffer.length > 1 << 20) {
        write(buffer);
        buffer = '';
      }
    }
    if (email) {
      if (!customers.has(customer)) customers.add(customer);
      orders++;
      totalCents += total;
    }
  }
  write(buffer);
  return { rows: written, unusableRows, customers: customers.size, orders, totalCents };
}
