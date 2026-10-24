// Runs parsing, previews and scoring off the main thread (ADR-0003).
import type { WorkerMessage, WorkerRequest } from './protocol';
import { runAnalysis } from './run-analysis';
import { runPreview } from './run-preview';

// The app compiles with the DOM library, so describe the worker scope we use here.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerMessage): void;
};

scope.onmessage = (event) => {
  const request = event.data;
  const post = (message: WorkerMessage) => scope.postMessage(message);
  if (request.type === 'preview') void runPreview(request.file, request.format, post);
  else void runAnalysis(request.file, request.plan, post, { format: request.format });
};
