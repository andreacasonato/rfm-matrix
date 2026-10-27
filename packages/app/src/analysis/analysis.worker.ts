// Runs parsing, previews and scoring off the main thread (ADR-0003). After an analysis the
// worker keeps its customer table and answers segment questions about it (S6).
import { handleSessionRequest } from '../segment/session';
import { runOpenSnapshot } from '../storage/open-snapshot';
import { exportProject, importProject } from '../storage/project-files';
import { handleSave } from '../storage/save-snapshot';
import type { WorkerMessage, WorkerRequest } from './protocol';
import { type Analysis, runAnalysis } from './run-analysis';
import { runPreview } from './run-preview';
import { runSummary } from './run-summary';
import { errorMessage } from './worker-error';

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
  } else if (request.type === 'open') {
    void runOpenSnapshot(request.snapshotId, request.map, post).then((a) => {
      analysis = a;
    });
  } else if (request.type === 'export-project') {
    exportProject(request.projectId).then(
      (saved) => post({ type: 'project-exported', ...saved }),
      (error: unknown) => post(errorMessage(error)),
    );
  } else if (request.type === 'import-project') {
    importProject(request.file).then(
      (result) => post({ type: 'project-imported', result }),
      (error: unknown) => post(errorMessage(error)),
    );
  } else if (request.type === 'save') void handleSave(analysis, request).then(post);
  else void handleSessionRequest(analysis?.table, request).then(post);
};
