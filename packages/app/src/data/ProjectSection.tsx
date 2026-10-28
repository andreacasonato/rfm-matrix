// One project on "Project and data": its saved analyses and settings, and Save project file
// (S9), the screen's primary action (APP_FLOW).
import { useState } from 'react';
import { startProjectExport } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { downloadFile } from '../components/download';
import { describeScoring } from '../screens/describe-scoring';
import { formatDay } from '../screens/format';
import type { SavedProjectFile } from '../storage/project-files';
import type { LoadedProject } from '../storage/projects';

type Props = {
  loaded: LoadedProject;
  exportFile?: (projectId: string) => Promise<SavedProjectFile>;
  download?: typeof downloadFile;
};

/** Built in a worker, so a large project never blocks the page. */
const exportInWorker = (projectId: string) =>
  startProjectExport(projectId).result.then(({ file, name, hasEmail }) => ({
    file,
    name,
    hasEmail,
  }));

const day = (iso: string) => formatDay(Date.parse(`${iso}T00:00:00Z`));

type SaveState =
  | { status: 'idle' | 'saving' }
  | { status: 'saved'; name: string }
  | { status: 'failed'; message: string };

export function ProjectSection({
  loaded,
  exportFile = exportInWorker,
  download = downloadFile,
}: Props) {
  const { project, snapshots } = loaded;
  const [save, setSave] = useState<SaveState>({ status: 'idle' });
  const hasEmail = project.columnMapping.columns.email !== undefined;

  async function saveFile() {
    setSave({ status: 'saving' });
    try {
      const saved = await exportFile(project.id);
      download(saved.file, saved.name);
      setSave({ status: 'saved', name: saved.name });
    } catch (error) {
      setSave({
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-6">
      <h2 className="text-section font-semibold">{project.name}</h2>
      <p className="text-small text-text-secondary">
        {hasEmail
          ? 'Emails are saved, because an email column was mapped.'
          : 'No emails are saved.'}{' '}
        {project.scoringConfig && describeScoring(project.scoringConfig)}
      </p>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Saved analyses of {project.name}</caption>
        <thead>
          <tr className="border-b border-border text-small text-text-secondary">
            <th scope="col" className="py-2 font-normal">
              Scores as of
            </th>
            <th scope="col" className="py-2 font-normal">
              File
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              Customers
            </th>
          </tr>
        </thead>
        <tbody>
          {[...snapshots].reverse().map((s) => (
            <tr key={s.id} className="border-b border-border">
              <td className="py-2">{day(s.analysisDate)}</td>
              <td className="py-2 break-all">{s.sourceFileName}</td>
              <td className="py-2 text-right font-mono text-number">
                {s.customerCount.toLocaleString('en-US')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          loading={save.status === 'saving'}
          loadingLabel="Saving…"
          onClick={() => void saveFile()}
        >
          Save project file
        </Button>
        <p className="text-small text-text-secondary">
          Keeps this project as a file you can open on any computer.
          {hasEmail && " The file will contain your customers' emails; store it safely."}
        </p>
      </div>
      {save.status === 'saved' && (
        <p role="status" className="text-small text-text-secondary">
          Saved {save.name}.
        </p>
      )}
      {save.status === 'failed' && (
        <p role="alert" className="text-small text-negative">
          The project file could not be saved: {save.message}
        </p>
      )}
    </section>
  );
}
