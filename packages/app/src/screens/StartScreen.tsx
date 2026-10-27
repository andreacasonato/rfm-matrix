import { Upload } from 'lucide-react';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { OpenProjectFile } from '../start/OpenProjectFile';
import type { ProjectSummary } from '../storage/projects';
import type { StorageState } from '../storage-probe';
import { formatDay } from './format';
import { plural } from './plural';

type Props = {
  onUpload(): void;
  onTrySample(): void;
  storage: StorageState;
  /** Saved on this device, newest first (S8). */
  projects?: ProjectSummary[];
  onOpenProject?(projectId: string): void;
  onProjectData?(): void;
  /** After Open project file added a project (S9). */
  onProjectOpened?(projectId: string): void;
  /** A confirmation to show, e.g. after Delete all data. */
  notice?: string;
};

export function StartScreen({
  onUpload,
  onTrySample,
  storage,
  projects = [],
  onOpenProject,
  onProjectData,
  onProjectOpened,
  notice,
}: Props) {
  return (
    <>
      {notice && <Notice tone="info" title={notice} />}
      <section className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-6">
        <h1 className="text-title font-semibold">
          See who your best, slipping and lost customers are
        </h1>
        <p className="text-text-secondary">
          Upload an order export and RFM Matrix groups your customers by how recently, how often and
          how much they buy. Your files are read in this browser tab and never leave your device.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon={<Upload aria-hidden size={16} />} onClick={onUpload}>
            Upload orders
          </Button>
          <Button onClick={onTrySample}>Try sample data</Button>
          {storage === 'available' && onProjectOpened && (
            <OpenProjectFile onOpened={onProjectOpened} />
          )}
        </div>
      </section>
      {projects.length > 0 && (
        <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-6">
          <h2 id="saved-projects" className="text-section font-semibold">
            Saved on this device
          </h2>
          <ul aria-labelledby="saved-projects" className="flex flex-col divide-y divide-border">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-semibold">{project.name}</p>
                  <p className="text-small text-text-secondary">
                    {plural(project.snapshots, 'analysis', 'analyses')}
                    {project.latest &&
                      ` · ${plural(project.latest.customerCount, 'customer')} as of ${formatDay(
                        Date.parse(`${project.latest.analysisDate}T00:00:00Z`),
                      )}`}
                  </p>
                </div>
                <Button
                  aria-label={`Open ${project.name}`}
                  onClick={() => onOpenProject?.(project.id)}
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {storage === 'available' && onProjectData && (
        <div>
          <Button variant="quiet" onClick={onProjectData}>
            Project and data
          </Button>
        </div>
      )}
      {storage === 'unavailable' && (
        <Notice tone="warning" title="This browser is not letting the app store data">
          You can still analyse a file, but nothing will be saved when you close this tab.
        </Notice>
      )}
    </>
  );
}
