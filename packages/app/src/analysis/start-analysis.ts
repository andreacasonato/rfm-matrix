// Starts the analysis worker from the page. Cancel stops the worker immediately.
import type {
  ColumnNames,
  DoneMessage,
  ProgressMessage,
  StartMessage,
  WorkerMessage,
} from './protocol';

export type AnalysisHandle = { result: Promise<DoneMessage>; cancel(): void };

export function startAnalysis(
  file: Blob,
  columns: ColumnNames,
  onProgress: (progress: ProgressMessage) => void,
): AnalysisHandle {
  const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
  let cancel = () => {};

  const result = new Promise<DoneMessage>((resolve, reject) => {
    const finish = (error?: Error, done?: DoneMessage) => {
      worker.terminate();
      if (error) reject(error);
      else if (done) resolve(done);
    };
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === 'progress') onProgress(message);
      else if (message.type === 'done') finish(undefined, message);
      else finish(new Error(message.message));
    };
    worker.onerror = (event) => {
      finish(new Error(event.message || 'The analysis worker stopped unexpectedly'));
    };
    cancel = () => finish(new DOMException('Analysis cancelled', 'AbortError'));
  });

  worker.postMessage({ type: 'start', file, columns } satisfies StartMessage);
  return { result, cancel: () => cancel() };
}
