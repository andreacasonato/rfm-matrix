// The grid page (DESIGN_BRIEF sketch): tiles, the heatmap beside the segment list, then how the
// numbers were made. Its one job is to show which segment to act on first.
import { defaultSegmentMap, type SegmentMap } from '@rfm-matrix/core';
import type { DoneMessage } from '../analysis/protocol';
import { Button } from '../components/Button';
import { describeScoring } from '../screens/describe-scoring';
import { formatDay } from '../screens/format';
import { Heatmap } from './Heatmap';
import { LeftOut } from './LeftOut';
import { SegmentPanel } from './SegmentPanel';
import { StatTiles } from './StatTiles';

const count = (n: number) => n.toLocaleString('en-US');

type Props = {
  result: DoneMessage;
  wallMs: number;
  map?: SegmentMap;
  onOpenSegment(segmentId: string): void;
  onEditRules?(): void;
  /** Only for a saved project (S10). */
  onMovement?(): void;
};

export function GridPage({
  result,
  wallMs,
  map = defaultSegmentMap,
  onOpenSegment,
  onEditRules,
  onMovement,
}: Props) {
  return (
    <>
      <StatTiles
        customers={result.customers}
        revenue={result.monetaryTotal}
        repeatCustomers={result.repeatCustomers}
        analysisDate={result.analysisDate}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <Heatmap cells={result.grid} segments={map.segments} onOpen={onOpenSegment} />
        <SegmentPanel summary={result.segments} onOpen={onOpenSegment} />
      </div>
      {(onEditRules || onMovement) && (
        <div className="flex flex-wrap gap-3">
          {onEditRules && <Button onClick={onEditRules}>Edit segment rules</Button>}
          {onMovement && <Button onClick={onMovement}>Movement</Button>}
        </div>
      )}
      <section className="flex flex-col gap-1 text-small text-text-secondary">
        <p>
          Scores as of {formatDay(Date.parse(`${result.analysisDate}T00:00:00Z`))}.{' '}
          {describeScoring(result.scoring)}
        </p>
        <LeftOut counts={result.cleaning} />
        <output data-status="done" data-wall-ms={wallMs} data-result={JSON.stringify(result)}>
          {count(result.rowsRead)} rows read ({count(result.invalidRows)} unusable),{' '}
          {count(result.customers)} customers, {count(result.orders)} orders, in{' '}
          {(wallMs / 1000).toFixed(2)} s.
        </output>
      </section>
    </>
  );
}
