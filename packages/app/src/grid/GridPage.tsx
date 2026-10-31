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
  /** Score thresholds (U5): what counts as a 1 to 5. */
  onThresholds?(): void;
  /** Only for a saved project (S10). */
  onMovement?(): void;
  onHowScores?(): void;
};

export function GridPage({
  result,
  wallMs,
  map = defaultSegmentMap,
  onOpenSegment,
  onEditRules,
  onThresholds,
  onMovement,
  onHowScores,
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
      {(onThresholds || onEditRules || onMovement) && (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          {/* The two kinds of rule, each with what it decides, so they are not mixed up. */}
          {onThresholds && (
            <div className="flex flex-col items-start gap-1">
              <Button onClick={onThresholds}>Score thresholds</Button>
              <p className="text-small text-text-secondary">What counts as a 1 to 5</p>
            </div>
          )}
          {onEditRules && (
            <div className="flex flex-col items-start gap-1">
              <Button onClick={onEditRules}>Edit segment rules</Button>
              <p className="text-small text-text-secondary">Which scores make each segment</p>
            </div>
          )}
          {onMovement && <Button onClick={onMovement}>Movement</Button>}
        </div>
      )}
      <section className="flex flex-col gap-1 text-small text-text-secondary">
        <p>
          Scores as of {formatDay(Date.parse(`${result.analysisDate}T00:00:00Z`))}.{' '}
          {describeScoring(result.scoring)}
          {onHowScores && (
            <>
              {' '}
              <Button variant="quiet" className="h-auto px-0 text-small" onClick={onHowScores}>
                How scores work
              </Button>
            </>
          )}
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
