// "Movement" (APP_FLOW): who moved since last time? Two saved analyses compared under the
// project's current rules (S10), biggest flows first, each exportable for an email tool.
import {
  type Movement,
  notInEarlier,
  notInLater,
  type ScoringMethods,
  type SegmentMap,
} from '@rfm-matrix/core';
import { useEffect, useState } from 'react';
import { startMovement, startMoversExport } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { downloadFile } from '../components/download';
import { Notice } from '../components/Notice';
import { formatDay } from '../screens/format';
import { plural } from '../screens/plural';
import type { MoversFile } from '../storage/movement';
import type { SnapshotSummary } from '../storage/projects';
import { MovementTable } from './MovementTable';

type Props = {
  /** Oldest first. */
  snapshots: SnapshotSummary[];
  map: SegmentMap;
  onBack(): void;
  onExported(message: string): void;
  compare?: (earlierId: string, laterId: string, map: SegmentMap) => Promise<Movement>;
  exportFlow?: (
    e: string,
    l: string,
    map: SegmentMap,
    from: string,
    to: string,
  ) => Promise<MoversFile>;
  download?: typeof downloadFile;
};

const compareInWorker = (e: string, l: string, map: SegmentMap) =>
  startMovement(e, l, map).result.then((m) => m.movement);
const exportInWorker = (e: string, l: string, map: SegmentMap, from: string, to: string) =>
  startMoversExport(e, l, map, from, to).result.then(({ file, name, rows }) => ({
    file,
    name,
    rows,
  }));

const outside: Record<string, string> = {
  [notInEarlier]: 'Not in earlier analysis',
  [notInLater]: 'Not in later analysis',
};
const field =
  'h-10 rounded-control border border-control-border bg-surface px-3 text-body text-text-primary enabled:hover:bg-canvas';
const label = (s: SnapshotSummary) =>
  `${formatDay(Date.parse(`${s.analysisDate}T00:00:00Z`))} · ${s.sourceFileName}`;

type Result =
  | { status: 'loading' }
  | { status: 'done'; movement: Movement }
  | { status: 'error'; message: string };

// Quintiles count as the same thresholds: they follow each month's customers by design (U5).
const sameScoring = (a?: ScoringMethods, b?: ScoringMethods) =>
  JSON.stringify(a) === JSON.stringify(b);

export function MovementScreen(props: Props) {
  const { snapshots, map, onBack, onExported } = props;
  const { compare = compareInWorker, exportFlow = exportInWorker, download = downloadFile } = props;
  const [earlier, setEarlier] = useState(snapshots.at(-2)?.id ?? '');
  const [later, setLater] = useState(snapshots.at(-1)?.id ?? '');
  const [result, setResult] = useState<Result>({ status: 'loading' });
  const order = (id: string) => snapshots.findIndex((s) => s.id === id);
  const byId = (id: string) => snapshots.find((s) => s.id === id);
  const valid = snapshots.length >= 2 && order(earlier) < order(later);
  const name = (id: string) => outside[id] ?? map.segments.find((s) => s.id === id)?.name ?? id;

  useEffect(() => {
    if (!valid) return;
    let current = true;
    setResult({ status: 'loading' });
    compare(earlier, later, map).then(
      (movement) => current && setResult({ status: 'done', movement }),
      (error: Error) => current && setResult({ status: 'error', message: error.message }),
    );
    return () => {
      current = false;
    };
  }, [compare, earlier, later, map, valid]);

  async function exportOne(from: string, to: string) {
    const out = await exportFlow(earlier, later, map, from, to);
    download(out.file, out.name);
    onExported(`${out.name} · ${plural(out.rows, 'customer')}`);
  }

  const header = (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-section font-semibold">Movement</h2>
      <Button variant="quiet" onClick={onBack}>
        Back to grid
      </Button>
    </div>
  );
  if (snapshots.length < 2) {
    return (
      <>
        {header}
        <Notice tone="info" title="Movement needs two analyses">
          <p>
            Next month, use Upload new export on this project with the new export, then come back
            here.
          </p>
        </Notice>
      </>
    );
  }
  const totals = result.status === 'done' ? result.movement.totals : undefined;
  return (
    <>
      {header}
      <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-6">
        <div className="flex flex-wrap gap-4">
          {(
            [
              ['Earlier analysis', earlier, setEarlier],
              ['Later analysis', later, setLater],
            ] as const
          ).map(([text, value, set]) => (
            <label key={text} className="flex flex-col gap-1 text-small text-text-secondary">
              {text}
              <select className={field} value={value} onChange={(e) => set(e.target.value)}>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="text-small text-text-secondary">
          Both analyses use your current segment rules, so this shows customers who changed, not
          rule edits.
        </p>
      </section>
      {!valid && (
        <Notice tone="error" title="Choose a later analysis that comes after the earlier one" />
      )}
      {valid && !sameScoring(byId(earlier)?.scoring, byId(later)?.scoring) && (
        <Notice tone="warning" title="These analyses used different score thresholds">
          <p>So some moves come from the change, not from customers.</p>
        </Notice>
      )}
      {valid && result.status === 'loading' && (
        <p aria-busy="true" className="text-text-secondary">
          Comparing analyses…
        </p>
      )}
      {valid && result.status === 'error' && (
        <Notice tone="error" title="The analyses could not be compared">
          <p>{result.message}</p>
        </Notice>
      )}
      {valid && totals && result.status === 'done' && (
        <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-6">
          <p>
            {totals.stayed.toLocaleString('en-US')} stayed in their segment,{' '}
            {totals.moved.toLocaleString('en-US')} moved,{' '}
            {totals.newCustomers.toLocaleString('en-US')} {totals.newCustomers === 1 ? 'is' : 'are'}{' '}
            new, {totals.gone.toLocaleString('en-US')} {totals.gone === 1 ? 'is' : 'are'} not in the
            later analysis.
          </p>
          <MovementTable movement={result.movement} name={name} onExport={exportOne} />
        </section>
      )}
    </>
  );
}
