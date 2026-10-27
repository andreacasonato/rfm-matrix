// The flows of one comparison, biggest first, each with Export (S10).
import type { Movement } from '@rfm-matrix/core';
import { Button } from '../components/Button';

type TableProps = {
  movement: Movement;
  name(id: string): string;
  onExport(from: string, to: string): Promise<void>;
};

export function MovementTable({ movement, name, onExport }: TableProps) {
  if (movement.flows.length === 0) return <p>Every customer stayed in the same segment.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Customers who moved</caption>
        <thead>
          <tr className="border-b border-border text-small text-text-secondary">
            <th scope="col" className="py-2 font-normal">
              From
            </th>
            <th scope="col" className="py-2 font-normal">
              To
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              Customers
            </th>
            <th scope="col" className="py-2">
              <span className="sr-only">Export</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {movement.flows.map((f) => (
            <tr key={`${f.from} ${f.to}`} className="border-b border-border">
              <td className="py-2 pr-2">{name(f.from)}</td>
              <td className="py-2 pr-2">{name(f.to)}</td>
              <td className="py-2 text-right font-mono text-number">
                {f.customers.toLocaleString('en-US')}
              </td>
              <td className="py-2 pl-2 text-right">
                <Button
                  variant="quiet"
                  aria-label={`Export movers from ${name(f.from)} to ${name(f.to)}`}
                  onClick={() => void onExport(f.from, f.to)}
                >
                  Export
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
