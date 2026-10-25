// Processing, then the segment counts. The styled grid replaces the list in slice S5.
import { useEffect, useRef, useState } from 'react';
import type { AnalysisPlan, CsvFormat, DoneMessage, ProgressMessage } from '../analysis/protocol';
import { type JobHandle, startAnalysis } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { SegmentList } from '../SegmentList';
import { describeScoring } from './describe-scoring';

type Props = {
  label: string;
  /** The file plus how to read it, loaded when the screen opens. */
  load(): Promise<AnalysisInput>;
  onStartOver(): void;
  analyse?: typeof startAnalysis;
};

export type AnalysisInput = { source: Blob; plan: AnalysisPlan; format: CsvFormat };

type State =
  | { status: 'running'; progress?: ProgressMessage }
  | { status: 'done'; result: DoneMessage; wallMs: number }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const count = (n: number) => n.toLocaleString('en-US');

// Why some orders and customers are not in the results (ADR-0013).
function LeftOut({ counts }: { counts: DoneMessage['cleaning'] }) {
  const parts = [
    [counts.status, 'by status'],
    [counts.afterAnalysisDate, 'after the analysis date'],
    [counts.beforeWindow, 'before the window'],
    [counts.withoutDate, 'without a date'],
  ]
    .filter(([n]) => Number(n) > 0)
    .map(([n, why]) => `${count(Number(n))} ${why}`);
  if (parts.length === 0 && counts.customersWithoutOrders === 0) return null;
  return (
    <p className="text-text-secondary">
      {parts.length > 0 && `Orders left out: ${parts.join(', ')}. `}
      {counts.refundsApplied > 0 && `${count(counts.refundsApplied)} refunds subtracted. `}
      {counts.customersWithoutOrders > 0 &&
        `${count(counts.customersWithoutOrders)} customers had no order left to score.`}
    </p>
  );
}

const isCancel = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export function ResultsScreen({ label, load, onStartOver, analyse = startAnalysis }: Props) {
  const [state, setState] = useState<State>({ status: 'running' });
  const job = useRef<JobHandle<DoneMessage> | null>(null);

  useEffect(() => {
    let stopped = false;
    const started = performance.now();
    load().then(
      ({ source, plan, format }) => {
        if (stopped) return;
        const current = analyse(source, plan, format, (progress) =>
          setState({ status: 'running', progress }),
        );
        job.current = current;
        current.result.then(
          (result) => setState({ status: 'done', result, wallMs: performance.now() - started }),
          (error: Error) => {
            // Cancel rejects the job too; the cancel button has already updated the screen.
            if (!stopped && !isCancel(error)) setState({ status: 'error', message: error.message });
          },
        );
      },
      (error: Error) => setState({ status: 'error', message: error.message }),
    );
    return () => {
      stopped = true;
      job.current?.cancel();
    };
  }, [load, analyse]);

  function cancel() {
    job.current?.cancel();
    job.current = null;
    setState({ status: 'cancelled' });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-semibold">{label}</h1>
        <Button variant="quiet" onClick={onStartOver}>
          Start over
        </Button>
      </div>
      {state.status === 'running' && (
        <section
          aria-busy="true"
          className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border bg-surface p-6"
        >
          <p>
            Running analysis…{' '}
            <span className="tabular-nums">{count(state.progress?.rowsRead ?? 0)}</span> rows,{' '}
            <span className="tabular-nums">{count(state.progress?.customers ?? 0)}</span> customers
            found
          </p>
          <Button onClick={cancel}>Cancel</Button>
        </section>
      )}
      {state.status === 'cancelled' && (
        <Notice
          tone="info"
          title="Analysis cancelled"
          actions={<Button onClick={onStartOver}>Start over</Button>}
        />
      )}
      {state.status === 'error' && (
        <Notice
          tone="error"
          title="Something went wrong"
          actions={<Button onClick={onStartOver}>Start over</Button>}
        >
          <p>{state.message}</p>
        </Notice>
      )}
      {state.status === 'done' && (
        <>
          <output
            data-status="done"
            data-wall-ms={state.wallMs}
            data-result={JSON.stringify(state.result)}
            className="text-text-secondary"
          >
            {count(state.result.rowsRead)} rows read ({count(state.result.invalidRows)} unusable),{' '}
            {count(state.result.customers)} customers, {count(state.result.orders)} orders, in{' '}
            {(state.wallMs / 1000).toFixed(2)} s.
          </output>
          <LeftOut counts={state.result.cleaning} />
          <p className="text-text-secondary">
            Analysed as of {state.result.analysisDate}. {describeScoring(state.result.scoring)}
          </p>
          <SegmentList summary={state.result.segments} />
        </>
      )}
    </>
  );
}
