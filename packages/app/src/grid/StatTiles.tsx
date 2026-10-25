// Four summary numbers above the grid (DESIGN_BRIEF): calm, no shadows, at most four tiles.
import { formatDay } from '../screens/format';

type Props = { customers: number; revenue: number; repeatCustomers: number; analysisDate: string };

const whole = (n: number) => Math.round(n).toLocaleString('en-US');

export function StatTiles({ customers, revenue, repeatCustomers, analysisDate }: Props) {
  const repeat = customers === 0 ? 0 : Math.round((repeatCustomers / customers) * 100);
  const tiles: [string, string][] = [
    ['Customers', whole(customers)],
    ['Revenue', whole(revenue)],
    ['Repeat customers', `${repeat}%`],
    ['Analysed', formatDay(Date.parse(`${analysisDate}T00:00:00Z`))],
  ];
  return (
    <ul aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(([label, value]) => (
        <li key={label} className="rounded-panel border border-border bg-surface px-4 py-3">
          <p className="text-small text-text-secondary">{label}</p>
          <p className="text-title font-semibold tabular-nums">{value}</p>
        </li>
      ))}
    </ul>
  );
}
