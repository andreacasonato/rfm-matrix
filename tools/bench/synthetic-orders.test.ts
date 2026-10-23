import { describe, expect, it } from 'vitest';
import { writeSyntheticOrders } from './synthetic-orders.ts';

// Independent reader for the test: splits on commas outside double quotes.
function cells(line: string): string[] {
  const out: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && quoted && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) {
      out.push(cell);
      cell = '';
    } else cell += ch;
  }
  out.push(cell);
  return out;
}

function generate(rows: number, seed: number) {
  let text = '';
  const expected = writeSyntheticOrders(rows, seed, (chunk) => {
    text += chunk;
  });
  return { lines: text.trimEnd().split('\n'), expected, bytes: text.length };
}

describe('writeSyntheticOrders', () => {
  it('writes exactly the requested rows plus a Shopify-style header', () => {
    const { lines } = generate(3000, 1);
    expect(lines).toHaveLength(3001);
    const header = cells(lines[0] ?? '');
    expect(header).toEqual(expect.arrayContaining(['Name', 'Email', 'Created at', 'Total']));
    expect(lines.slice(1).every((l) => cells(l).length === header.length)).toBe(true);
  });

  it('reports totals that match the rows it wrote', () => {
    const { lines, expected } = generate(3000, 2);
    const header = cells(lines[0] ?? '');
    const col = (name: string) => header.indexOf(name);
    const orders = new Set<string>();
    const customers = new Set<string>();
    let cents = 0;
    let unusable = 0;
    for (const line of lines.slice(1)) {
      const row = cells(line);
      const email = row[col('Email')] ?? '';
      if (!email) {
        unusable++;
        continue;
      }
      customers.add(email);
      orders.add(row[col('Name')] ?? '');
      cents += Math.round(Number(row[col('Total')] || '0') * 100);
    }
    expect(expected).toEqual({
      rows: 3000,
      unusableRows: unusable,
      customers: customers.size,
      orders: orders.size,
      totalCents: cents,
    });
    expect(unusable).toBeGreaterThan(0);
  });

  it('is repeatable for a seed and averages about 300 bytes per row', () => {
    const a = generate(2000, 7);
    expect(generate(2000, 7).lines).toEqual(a.lines);
    expect(a.bytes / 2000).toBeGreaterThan(250);
    expect(a.bytes / 2000).toBeLessThan(350);
  });

  it('mixes one-time and repeat buyers, multi-line orders and quoted fields', () => {
    const { lines, expected } = generate(6000, 3);
    expect(expected.orders / expected.customers).toBeGreaterThan(1.2);
    expect(expected.orders / expected.customers).toBeLessThan(3);
    expect(expected.rows).toBeGreaterThan(expected.orders);
    expect(lines.some((l) => l.includes('""'))).toBe(true);
  });
});
