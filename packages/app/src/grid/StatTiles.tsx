// Four summary numbers above the grid (DESIGN_BRIEF): calm, no shadows, at most four tiles.

type Props = { customers: number; revenue: number; repeatCustomers: number; analysisDate: string };

const whole = (n: number) => Math.round(n).toLocaleString('en-US');
const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

export function StatTiles({ customers, revenue, repeatCustomers, analysisDate }: Props) {
  const repeat = customers === 0 ? 0 : Math.round((repeatCustomers / customers) * 100);
  const tiles: [string, string][] = [
    ['Customers', whole(customers)],
    ['Revenue', whole(revenue)],
    ['Repeat customers', `${repeat}%`],
    ['Analysed', shortDay(analysisDate)],
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
