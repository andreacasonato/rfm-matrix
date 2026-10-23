// Usage: node tools/bench/generate.ts [--rows 1000000] [--seed 1]
// Writes bench-data/orders-<rows>.csv and its expected totals. bench-data/ is git-ignored.
import { closeSync, mkdirSync, openSync, writeFileSync, writeSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { writeSyntheticOrders } from './synthetic-orders.ts';

const { values } = parseArgs({
  options: { rows: { type: 'string', default: '1000000' }, seed: { type: 'string', default: '1' } },
});
const rows = Number(values.rows);
const seed = Number(values.seed);
if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(seed)) {
  console.error('--rows must be a positive whole number and --seed a whole number.');
  process.exit(1);
}

mkdirSync('bench-data', { recursive: true });
const csvPath = `bench-data/orders-${rows}.csv`;
const fd = openSync(csvPath, 'w');
const expected = writeSyntheticOrders(rows, seed, (chunk) => writeSync(fd, chunk));
closeSync(fd);

const expectedPath = `bench-data/orders-${rows}.expected.json`;
writeFileSync(expectedPath, `${JSON.stringify({ seed, ...expected }, null, 2)}\n`);
console.log(`Wrote ${csvPath}: ${expected.rows} rows, ${expected.customers} customers.`);
