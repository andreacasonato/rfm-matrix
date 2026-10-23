// Runs parsing and aggregation off the main thread (ADR-0003).
import type { StartMessage, WorkerMessage } from './protocol';
import { runAnalysis } from './run-analysis';

// The app compiles with the DOM library, so describe the worker scope we use here.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<StartMessage>) => void) | null;
  postMessage(message: WorkerMessage): void;
};

scope.onmessage = (event) => {
  const { file, columns } = event.data;
  void runAnalysis(file, columns, (message) => scope.postMessage(message));
};
