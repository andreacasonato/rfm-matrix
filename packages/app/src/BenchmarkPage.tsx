// M1 prototype page: pick a Shopify-style CSV and see how fast it is reduced to customers.
// Unstyled on purpose; the real screens replace it from M2.
import { useRef, useState } from 'react';
import type { DoneMessage, ProgressMessage } from './analysis/protocol';
import { type AnalysisHandle, startAnalysis } from './analysis/start-analysis';

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

export function BenchmarkPage() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const handle = useRef<AnalysisHandle | null>(null);

  function analyse(file: File) {
    handle.current?.cancel();
    const started = performance.now();
    setState({ status: 'running' });
    const current = startAnalysis(file, shopifyColumns, (progress) =>
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

  function cancel() {
    const current = handle.current;
    handle.current = null;
    current?.cancel();
    setState({ status: 'idle' });
  }

  return (
    <main>
      <h1>RFM Matrix</h1>
      <p>M1 prototype: measures how fast an order export is reduced to customer totals.</p>
      <label>
        Order export (CSV){' '}
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={state.status === 'running'}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) analyse(file);
            event.target.value = '';
          }}
        />
      </label>
      {state.status === 'running' && (
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
        <output
          data-status="done"
          data-wall-ms={state.wallMs}
          data-result={JSON.stringify(state.result)}
        >
          {count(state.result.rowsRead)} rows read ({count(state.result.invalidRows)} unusable),{' '}
          {count(state.result.customers)} customers, {count(state.result.orders)} orders, in{' '}
          {(state.wallMs / 1000).toFixed(2)} s.
        </output>
      )}
    </main>
  );
}
