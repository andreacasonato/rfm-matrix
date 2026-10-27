// The 25 recency × frequency squares as choices: one segment each, for every M score at once or
// for one M score (`layer`). The family colour marks each square, beside the segment's name.
import { cellIndex, type Score, type Segment, type SegmentMap, segmentFor } from '@rfm-matrix/core';
import { familyOf } from '../grid/families';
import { plural } from '../screens/plural';

type Props = {
  map: SegmentMap;
  layer: Score | 'all';
  cellCustomers: number[];
  onChange(r: Score, f: Score, segmentId: string): void;
};

const scores = [1, 2, 3, 4, 5] as const;
const field =
  'h-10 w-full min-w-0 rounded-control border border-control-border bg-surface px-2 text-small text-text-primary enabled:hover:bg-canvas';

const customersIn = (counts: number[], r: Score, f: Score, layer: Score | 'all') =>
  (layer === 'all' ? [...scores] : [layer]).reduce<number>(
    (n, m) => n + (counts[cellIndex(r, f, m)] ?? 0),
    0,
  );

export function RulesGrid({ map, layer, cellCustomers, onChange }: Props) {
  const sorted: Segment[] = [...map.segments].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-surface p-4">
      <table className="w-full min-w-[40rem] table-fixed border-separate border-spacing-1">
        <caption className="pb-2 text-left text-section font-semibold">
          {layer === 'all' ? 'Rules for every M score' : `Rules for M${layer}`}
        </caption>
        <thead>
          <tr className="text-small text-text-secondary">
            <th scope="col" className="w-7">
              <span className="sr-only">Recency score</span>
            </th>
            {scores.map((f) => (
              <th key={f} scope="col" className="font-normal">
                F{f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...scores].reverse().map((r) => (
            <tr key={r}>
              <th scope="row" className="text-left text-small font-normal text-text-secondary">
                R{r}
              </th>
              {scores.map((f) => {
                const value = segmentFor(map, r, f, layer === 'all' ? 1 : layer);
                const name = layer === 'all' ? `R${r} F${f}` : `R${r} F${f} M${layer}`;
                const count = customersIn(cellCustomers, r, f, layer);
                return (
                  <td
                    key={f}
                    data-testid={`cell-R${r}-F${f}`}
                    className={`rounded-cell p-2 align-top ${familyOf(value).pill}`}
                  >
                    <select
                      aria-label={`Segment for ${name}`}
                      className={field}
                      value={value}
                      onChange={(event) => onChange(r, f, event.target.value)}
                    >
                      {sorted.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-small">{plural(count, 'customer')}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
