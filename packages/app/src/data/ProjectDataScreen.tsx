// "Project and data" (APP_FLOW): what is saved on this device? Projects with their analyses and
// settings, the storage used, and Delete all data. Save project file arrives with S9.
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { deleteAllData } from '../storage/delete-all';
import { type LoadedProject, loadAllProjects } from '../storage/projects';
import { DeleteAllDialog } from './DeleteAllDialog';
import { ProjectSection } from './ProjectSection';

type Props = {
  onBack(): void;
  onDeleted(): void;
  load?: typeof loadAllProjects;
  estimate?: () => Promise<{ usage?: number }>;
  deleteAll?: typeof deleteAllData;
};

const browserEstimate = async () => (await navigator.storage?.estimate?.()) ?? {};
const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;
const panel = 'flex flex-col gap-3 rounded-panel border border-border bg-surface p-6';

export function ProjectDataScreen({
  onBack,
  onDeleted,
  load = loadAllProjects,
  estimate = browserEstimate,
  deleteAll = deleteAllData,
}: Props) {
  const [projects, setProjects] = useState<LoadedProject[] | null>(null);
  const [usage, setUsage] = useState<number | undefined>();
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    void load().then(setProjects, () => setProjects([]));
    void estimate().then(
      (e) => setUsage(e.usage),
      () => {},
    );
  }, [load, estimate]);

  const snapshots = projects?.reduce((n, p) => n + p.snapshots.length, 0) ?? 0;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-semibold">Project and data</h1>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>
      <p className="text-text-secondary">
        Everything below is kept in this browser on this device only. Raw order rows, names,
        addresses and phone numbers are never saved.
        {usage !== undefined && ` RFM Matrix uses ${megabytes(usage)} of this browser's storage.`}
      </p>
      {projects?.length === 0 && (
        <Notice tone="info" title="Nothing is saved on this device">
          <p>Analyses of your own files are saved here when they finish.</p>
        </Notice>
      )}
      {projects?.map((loaded) => (
        <ProjectSection key={loaded.project.id} loaded={loaded} />
      ))}
      <section className={panel}>
        <h2 className="text-section font-semibold">Delete all data</h2>
        <p className="text-text-secondary">
          Removes every project, saved analysis and rule from this browser.
        </p>
        <div>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete all data
          </Button>
        </div>
      </section>
      {confirming && (
        <DeleteAllDialog
          projects={projects?.length ?? 0}
          snapshots={snapshots}
          deleteAll={deleteAll}
          onCancel={() => setConfirming(false)}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}
