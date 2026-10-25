// Column-mapping presets as data (TRD §5, ADR-0012) and checks on a mapping.

export type Field =
  | 'customerId'
  | 'email'
  | 'orderId'
  | 'orderedAt'
  | 'amount'
  | 'status'
  | 'refunded'
  | 'tax'
  | 'shipping';
/** Column index in the file's header for each mapped field. */
export type ColumnMapping = Partial<Record<Field, number>>;
export type PresetId = 'shopify' | 'woocommerce' | 'other';
export type Preset = {
  id: PresetId;
  name: string;
  /** False until checked against a real, anonymised export header. */
  verified: boolean;
  columns: Partial<Record<Field, string[]>>;
};

export const fieldLabels: Record<Field, string> = {
  customerId: 'Customer ID',
  email: 'Email',
  orderId: 'Order ID',
  orderedAt: 'Order date',
  amount: 'Amount',
  status: 'Status',
  refunded: 'Refunded amount',
  tax: 'Tax',
  shipping: 'Shipping',
};

// Guessing order: required fields first, so they get first pick of the columns.
const guessOrder: Field[] = [
  'orderId',
  'orderedAt',
  'amount',
  'email',
  'customerId',
  'status',
  'refunded',
  'tax',
  'shipping',
];

const common: Preset['columns'] = {
  customerId: [
    'customer id',
    'customer number',
    'customer no',
    'customer user id',
    'customer user',
    'client id',
    'user id',
    'buyer id',
  ],
  email: [
    'email',
    'e-mail',
    'email address',
    'customer email',
    'billing email',
    'email (billing)',
    'buyer email',
  ],
  orderId: [
    'order id',
    'order number',
    'order no',
    'order #',
    'order',
    'order ref',
    'invoice number',
    'transaction id',
  ],
  orderedAt: [
    'order date',
    'created at',
    'date created',
    'date',
    'created',
    'purchase date',
    'order created',
  ],
  amount: [
    'order total',
    'total',
    'order total amount',
    'amount',
    'total amount',
    'grand total',
    'total price',
    'revenue',
    'net sales',
    'sales',
  ],
  status: ['status', 'order status', 'financial status', 'payment status'],
  refunded: ['refunded amount', 'refunded', 'refund amount', 'total refunded', 'refunds'],
  tax: ['tax', 'taxes', 'tax amount', 'total tax', 'vat'],
  shipping: ['shipping', 'shipping amount', 'shipping cost', 'shipping total', 'delivery cost'],
};

export const presets: Preset[] = [
  {
    // Shopify's documented order export: one row per product line, total on the first line.
    id: 'shopify',
    name: 'Shopify',
    verified: true,
    columns: {
      email: ['Email'],
      orderId: ['Name'],
      orderedAt: ['Created at'],
      amount: ['Total'],
      status: ['Financial Status'],
      refunded: ['Refunded Amount'],
      tax: ['Taxes'],
      shipping: ['Shipping'],
    },
  },
  {
    // Names used by common WooCommerce export plugins; unverified (ADR-0012).
    id: 'woocommerce',
    name: 'WooCommerce',
    verified: false,
    columns: {
      customerId: ['customer_id', 'customer user id', 'customer user'],
      email: ['billing_email', 'email (billing)', 'billing email'],
      orderId: ['order_number', 'order_id', 'order number', 'order id'],
      orderedAt: ['order_date', 'date_created', 'order date'],
      amount: ['order_total', 'order total amount', 'order total'],
      status: ['status', 'order_status', 'order status'],
      refunded: ['refunded_total', 'order refund amount'],
      tax: ['tax_total', 'order total tax amount'],
      shipping: ['shipping_total', 'order shipping amount'],
    },
  },
  { id: 'other', name: 'Other shop or spreadsheet', verified: false, columns: {} },
];

const normalise = (name: string) =>
  name.trim().toLowerCase().replace(/_+/g, ' ').replace(/\s+/g, ' ');

function presetById(id: PresetId): Preset {
  const preset = presets.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown preset: ${id}`);
  return preset;
}

export function detectPreset(header: string[]): PresetId {
  const names = new Set(header.map((cell) => cell.trim()));
  if (['Name', 'Email', 'Created at', 'Total'].every((n) => names.has(n))) return 'shopify';
  const normalised = header.map(normalise);
  const wooOrder = (presetById('woocommerce').columns.orderId ?? []).map(normalise);
  const billing = normalised.some((n) => n.includes('billing'));
  return billing && normalised.some((n) => wooOrder.includes(n)) ? 'woocommerce' : 'other';
}

export function guessMapping(header: string[], presetId: PresetId): ColumnMapping {
  const preset = presetById(presetId);
  const normalised = header.map(normalise);
  const used = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const field of guessOrder) {
    const candidates = [...(preset.columns[field] ?? []), ...(common[field] ?? [])].map(normalise);
    for (const candidate of candidates) {
      const index = normalised.findIndex((name, i) => name === candidate && !used.has(i));
      if (index >= 0) {
        mapping[field] = index;
        used.add(index);
        break;
      }
    }
  }
  return mapping;
}

/** Problems in plain words; empty when the mapping can be used. */
export function validateMapping(mapping: ColumnMapping, header: string[]): string[] {
  const problems: string[] = [];
  if (mapping.customerId === undefined && mapping.email === undefined) {
    problems.push('Choose the column with the customer ID or the email.');
  }
  if (mapping.orderId === undefined) problems.push('Choose the column with the order ID.');
  if (mapping.orderedAt === undefined) problems.push('Choose the column with the order date.');
  if (mapping.amount === undefined) problems.push('Choose the column with the order amount.');

  const fields = Object.keys(fieldLabels) as Field[];
  const owner = new Map<number, Field>();
  for (const field of fields) {
    const index = mapping[field];
    if (index === undefined) continue;
    if (index < 0 || index >= header.length) {
      problems.push(`${fieldLabels[field]} points to a column that is not in this file.`);
      continue;
    }
    const other = owner.get(index);
    if (other) {
      problems.push(
        `"${header[index]}" is chosen for both ${fieldLabels[other]} and ${fieldLabels[field]}.`,
      );
    } else owner.set(index, field);
  }
  return problems;
}
