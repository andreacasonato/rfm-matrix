// The RFM grid as a tinted heatmap (DESIGN_BRIEF): R down, F across, count in each cell, tint by
// share, segment names over their cells and edges drawn where the segment changes.
import type { GridCell, Segment } from '@rfm-matrix/core';
import { heatClasses, heatStep } from './heat';

type Props = { cells: GridCell[]; segments: Segment[] };

const at = (cells: GridCell[], r: number, f: number) => cells.find((c) => c.r === r && c.f === f);

export function Heatmap({ cells, segments }: Props) {
  const largest = Math.max(0, ...cells.map((c) => c.customers));
  const name = (id: string | null) =>
    id === null ? 'Mixed segments' : (segments.find((s) => s.id === id)?.name ?? id);
  const labelled = new Set<string | null>();
  const rows = [5, 4, 3, 2, 1] as const;
  const columns = [1, 2, 3, 4, 5] as const;

  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-surface p-4">
      <table className="w-full border-separate border-spacing-1">
        <caption className="pb-2 text-left text-section font-semibold">
          Customers by recency and frequency
        </caption>
        <thead>
          <tr className="text-small text-text-secondary">
            <th scope="col">
              <span className="sr-only">Recency score</span>
            </th>
            {columns.map((f) => (
              <th key={f} scope="col" className="font-normal">
                F{f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th scope="row" className="pr-1 text-small font-normal text-text-secondary">
                R{r}
              </th>
              {columns.map((f, i) => {
                const cell = at(cells, r, f);
                if (!cell) return <td key={f} />;
                const step = heatStep(cell.customers, largest);
                const segment = name(cell.segmentId);
                const first = !labelled.has(cell.segmentId);
                labelled.add(cell.segmentId);
                const edge = (other: GridCell | undefined, side: string) =>
                  other && other.segmentId !== cell.segmentId ? side : '';
                return (
                  <td
                    key={f}
                    aria-label={`${segment}, R${r} F${f}: ${cell.customers.toLocaleString('en-US')} customers`}
                    title={segment}
                    style={{ animationDelay: `${((5 - r) * 5 + i) * 25}ms` }}
                    className={`h-16 min-w-16 rounded-cell border-2 border-transparent p-2 align-top ${heatClasses[step]} ${
                      step > 0 ? 'motion-safe:animate-heat-fill' : ''
                    } ${edge(at(cells, r, f + 1), 'border-r-text-secondary')} ${edge(
                      at(cells, r - 1, f),
                      'border-b-text-secondary',
                    )} ${edge(at(cells, r, f - 1), 'border-l-text-secondary')} ${edge(
                      at(cells, r + 1, f),
                      'border-t-text-secondary',
                    )}`}
                  >
                    {first && <span className="block text-small leading-tight">{segment}</span>}
                    <span className="font-mono text-number">
                      {cell.customers.toLocaleString('en-US')}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-small text-text-secondary">
        R5 bought most recently, F5 most often. Darker cells hold more customers.
      </p>
    </div>
  );
}
