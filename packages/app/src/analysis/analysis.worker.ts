// Runs parsing, previews and scoring off the main thread (ADR-0003). After an analysis the
// worker keeps its customer table and answers segment questions about it (S6).
import { handleSessionRequest } from '../segment/session';
import { handleSave } from '../storage/save-snapshot';
import type { WorkerMessage, WorkerRequest } from './protocol';
import { type Analysis, runAnalysis } from './run-analysis';
import { runPreview } from './run-preview';
import { runSummary } from './run-summary';

// The app compiles with the DOM library, so describe the worker scope we use here.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerMessage): void;
};

let analysis: Analysis | undefined;

scope.onmessage = (event) => {
  const request = event.data;
  const post = (message: WorkerMessage) => scope.postMessage(message);
  if (request.type === 'preview') void runPreview(request.file, request.format, post);
  else if (request.type === 'summary') {
    void runSummary(request.file, request.plan, request.format, post);
  } else if (request.type === 'start') {
    void runAnalysis(request.file, request.plan, post, { format: request.format }).then((a) => {
      analysis = a;
    });
  } else if (request.type === 'save') void handleSave(analysis, request).then(post);
  else void handleSessionRequest(analysis?.table, request).then(post);
};
