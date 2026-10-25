// The RFM grid as a tinted heatmap (DESIGN_BRIEF): R down, F across, count in each cell, tint by
// share, and each segment outlined as one region: a dark edge where the segment changes and
// around the grid, a thin surface-coloured line between cells of the same segment.
import type { GridCell, Segment } from '@rfm-matrix/core';
import { heatClasses, heatStep } from './heat';

type Props = { cells: GridCell[]; segments: Segment[]; onOpen?(segmentId: string): void };

const at = (cells: GridCell[], r: number, f: number) => cells.find((c) => c.r === r && c.f === f);

// Literal class names so Tailwind generates them.
const edges = {
  t: ['border-t-text-primary', 'border-t-surface'],
  r: ['border-r-text-primary', 'border-r-surface'],
  b: ['border-b-text-primary', 'border-b-surface'],
  l: ['border-l-text-primary', 'border-l-surface'],
} as const;

function edgeClasses(cell: GridCell, cells: GridCell[]): string {
  const neighbours = {
    t: at(cells, cell.r + 1, cell.f),
    r: at(cells, cell.r, cell.f + 1),
    b: at(cells, cell.r - 1, cell.f),
    l: at(cells, cell.r, cell.f - 1),
  };
  return (Object.keys(edges) as (keyof typeof edges)[])
    .map((side) => {
      const other = neighbours[side];
      const outline = !other || other.segmentId !== cell.segmentId;
      return edges[side][outline ? 0 : 1];
    })
    .join(' ');
}

export function Heatmap({ cells, segments, onOpen }: Props) {
  const largest = Math.max(0, ...cells.map((c) => c.customers));
  const name = (id: string | null) =>
    id === null ? 'Mixed segments' : (segments.find((s) => s.id === id)?.name ?? id);
  const labelled = new Set<string | null>();
  const rows = [5, 4, 3, 2, 1] as const;
  const columns = [1, 2, 3, 4, 5] as const;

  return (
    <div className="rounded-panel border border-border bg-surface p-4">
      <table className="w-full table-fixed border-separate border-spacing-0">
        <caption className="pb-2 text-left text-section font-semibold">
          Customers by recency and frequency
        </caption>
        <thead>
          <tr className="text-small text-text-secondary">
            <th scope="col" className="w-7">
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
              <th scope="row" className="text-left text-small font-normal text-text-secondary">
                R{r}
              </th>
              {columns.map((f, i) => {
                const cell = at(cells, r, f);
                if (!cell) return <td key={f} />;
                const step = heatStep(cell.customers, largest);
                const segment = name(cell.segmentId);
                const first = !labelled.has(cell.segmentId);
                labelled.add(cell.segmentId);
                const content = (
                  <>
                    {first && (
                      <span className="block break-words hyphens-auto text-small leading-tight">
                        {segment}
                      </span>
                    )}
                    <span className="font-mono text-number">
                      {cell.customers.toLocaleString('en-US')}
                    </span>
                  </>
                );
                return (
                  <td
                    key={f}
                    aria-label={`${segment}, R${r} F${f}: ${cell.customers.toLocaleString('en-US')} customers`}
                    title={segment}
                    style={{ animationDelay: `${((5 - r) * 5 + i) * 25}ms` }}
                    className={`h-14 border-2 p-1 align-top sm:h-16 sm:p-2 ${heatClasses[step]} ${
                      step > 0 ? 'motion-safe:animate-heat-fill' : ''
                    } ${edgeClasses(cell, cells)}`}
                  >
                    {onOpen && cell.segmentId ? (
                      <button
                        type="button"
                        aria-label={`Open ${segment}, R${r} F${f}`}
                        onClick={() => cell.segmentId && onOpen(cell.segmentId)}
                        className="block size-full text-left"
                      >
                        {content}
                      </button>
                    ) : (
                      content
                    )}
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
