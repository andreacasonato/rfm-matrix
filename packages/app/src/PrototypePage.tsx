// Prototype page for M1–M2: pick a Shopify-style CSV or the sample, see segment counts.
// Unstyled on purpose; the real screens replace it in M3.
import { useRef, useState } from 'react';
import type { DoneMessage, ProgressMessage } from './analysis/protocol';
import { type JobHandle, startAnalysis } from './analysis/worker-client';
import { SegmentList } from './SegmentList';

const shopifyColumns = {
  customer: 'Email',
  orderId: 'Name',
  orderedAt: 'Created at',
  amount: 'Total',
};

type State =
  | { status: 'idle' }
  | { status: 'running'; progress?: ProgressMessage }
  | { status: 'done'; result: DoneMessage; wallMs: number }
  | { status: 'error'; message: string };

const count = (n: number) => n.toLocaleString('en-US');

async function loadSample(): Promise<Blob> {
  // A static file of the app itself, same origin (ADR-0010 notes).
  const response = await fetch('sample-orders.csv');
  if (!response.ok) throw new Error(`The sample data could not be loaded (${response.status}).`);
  return response.blob();
}

export function PrototypePage() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const handle = useRef<JobHandle<DoneMessage> | null>(null);
  const running = state.status === 'running';

  function analyse(file: Blob) {
    handle.current?.cancel();
    const started = performance.now();
    setState({ status: 'running' });
    const current = startAnalysis(file, shopifyColumns, {}, (progress) =>
      setState({ status: 'running', progress }),
    );
    handle.current = current;
    current.result.then(
      (result) => setState({ status: 'done', result, wallMs: performance.now() - started }),
      (error: Error) => {
        if (handle.current === current) setState({ status: 'error', message: error.message });
      },
    );
  }

  function trySample() {
    setState({ status: 'running' });
    loadSample().then(analyse, (error: Error) =>
      setState({ status: 'error', message: error.message }),
    );
  }

  function cancel() {
    const current = handle.current;
    handle.current = null;
    current?.cancel();
    setState({ status: 'idle' });
  }

  return (
    <main>
      <h1>RFM Matrix</h1>
      <p>Prototype: your file is read in this browser tab and never leaves your device.</p>
      <label>
        Order export (CSV){' '}
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={running}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) analyse(file);
            event.target.value = '';
          }}
        />
      </label>{' '}
      <button type="button" onClick={trySample} disabled={running}>
        Try sample data
      </button>
      {running && (
        <p>
          Reading… {count(state.progress?.rowsRead ?? 0)} rows,{' '}
          {count(state.progress?.customers ?? 0)} customers found.{' '}
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        </p>
      )}
      {state.status === 'error' && <p role="alert">Something went wrong: {state.message}</p>}
      {state.status === 'done' && (
        <>
          <output
            data-status="done"
            data-wall-ms={state.wallMs}
            data-result={JSON.stringify(state.result)}
          >
            {count(state.result.rowsRead)} rows read ({count(state.result.invalidRows)} unusable),{' '}
            {count(state.result.customers)} customers, {count(state.result.orders)} orders, in{' '}
            {(state.wallMs / 1000).toFixed(2)} s.
          </output>
          <p>
            Analysed as of {state.result.analysisDate}. Recency and monetary scores use quintiles
            (as Excel's PERCENTILE.INC); frequency uses fixed breaks of 1, 2, 3, 4–5 and 6+ orders.
          </p>
          <SegmentList summary={state.result.segments} />
        </>
      )}
    </main>
  );
}
