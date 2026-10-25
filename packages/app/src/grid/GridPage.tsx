// The grid page (DESIGN_BRIEF sketch): tiles, the heatmap beside the segment list, then how the
// numbers were made. Its one job is to show which segment to act on first.
import { defaultSegmentMap } from '@rfm-matrix/core';
import type { DoneMessage } from '../analysis/protocol';
import { describeScoring } from '../screens/describe-scoring';
import { formatDay } from '../screens/format';
import { Heatmap } from './Heatmap';
import { LeftOut } from './LeftOut';
import { SegmentPanel } from './SegmentPanel';
import { StatTiles } from './StatTiles';

const count = (n: number) => n.toLocaleString('en-US');

export function GridPage({ result, wallMs }: { result: DoneMessage; wallMs: number }) {
  return (
    <>
      <StatTiles
        customers={result.customers}
        revenue={result.monetaryTotal}
        repeatCustomers={result.repeatCustomers}
        analysisDate={result.analysisDate}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <Heatmap cells={result.grid} segments={defaultSegmentMap.segments} />
        <SegmentPanel summary={result.segments} />
      </div>
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
