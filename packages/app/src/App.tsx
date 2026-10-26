// Screen switching (ADR-0011: a small state machine, no router).
import { defaultSegmentMap } from '@rfm-matrix/core';
import type { CsvPreview } from '@rfm-matrix/io';
import { useEffect, useState } from 'react';
import type { AnalysisPlan, CsvFormat } from './analysis/protocol';
import { startPreview, startSummary } from './analysis/worker-client';
import { Page } from './components/Page';
import { ProjectDataScreen } from './data/ProjectDataScreen';
import { defaultCleaning } from './mapping/default-cleaning';
import { initialPlan } from './mapping/initial-plan';
import type { ProjectContext } from './screens/AnalysisView';
import { CleanScreen } from './screens/CleanScreen';
import { MapScreen } from './screens/MapScreen';
import { type AnalysisInput, ResultsScreen } from './screens/ResultsScreen';
import { StartScreen } from './screens/StartScreen';
import { UploadScreen } from './screens/UploadScreen';
import { loadProject } from './storage/projects';
import { useSavedProjects } from './storage/use-saved-projects';
import { probeStorage, type StorageState } from './storage-probe';

type Screen =
  | { name: 'start'; notice?: string }
  | { name: 'data' }
  | { name: 'upload' }
  | { name: 'map'; file: File; preview: CsvPreview }
  | { name: 'clean'; file: File; preview: CsvPreview; plan: AnalysisPlan; format: CsvFormat }
  | { name: 'results'; label: string; load(): Promise<AnalysisInput>; project?: ProjectContext };

/** "orders-2026.csv" → "orders-2026": the name of a new project. */
const projectName = (fileName: string) => fileName.replace(/\.[^.]+$/, '') || fileName;

async function loadSample(): Promise<AnalysisInput> {
  // A static file of the app itself, same origin (ADR-0010 notes).
  const response = await fetch('sample-orders.csv');
  if (!response.ok) throw new Error(`The sample data could not be loaded (${response.status}).`);
  const source = await response.blob();
  // The sample goes through the same preview, guess and default cleaning as an uploaded file.
  const { preview } = await startPreview(source, {}, () => {}).result;
  const { plan } = initialPlan(preview);
  const { summary } = await startSummary(source, plan, {}, () => {}).result;
  return { source, plan: { ...plan, cleaning: defaultCleaning(summary, plan) }, format: {} };
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });
  const [storage, setStorage] = useState<StorageState>('checking');
  useEffect(() => {
    void probeStorage().then(setStorage);
  }, []);
  const projects = useSavedProjects(storage === 'available' && screen.name === 'start');

  async function openProject(id: string) {
    const loaded = await loadProject(id);
    const latest = loaded?.snapshots.at(-1);
    if (!loaded || !latest) return;
    const { project, map } = loaded;
    const { columns } = project.columnMapping;
    const input: AnalysisInput = {
      snapshotId: latest.id,
      map,
      hasEmail: columns.email !== undefined && columns.customerId !== undefined,
    };
    setScreen({
      name: 'results',
      label: project.name,
      load: () => Promise.resolve(input),
      project: { id: project.id, name: project.name, map },
    });
  }

  const start = () => setScreen({ name: 'start' });

  return (
    <Page wide={screen.name === 'results'}>
      {screen.name === 'start' && (
        <StartScreen
          storage={storage}
          onUpload={() => setScreen({ name: 'upload' })}
          onTrySample={() =>
            setScreen({ name: 'results', label: 'Sample store', load: loadSample })
          }
          projects={projects}
          onOpenProject={(id) => void openProject(id)}
          onProjectData={() => setScreen({ name: 'data' })}
          {...(screen.notice ? { notice: screen.notice } : {})}
        />
      )}
      {screen.name === 'data' && (
        <ProjectDataScreen
          onBack={start}
          onDeleted={() =>
            setScreen({ name: 'start', notice: 'All data on this device was deleted.' })
          }
        />
      )}
      {screen.name === 'upload' && (
        <UploadScreen
          onBack={start}
          onContinue={(file, preview) => setScreen({ name: 'map', file, preview })}
        />
      )}
      {screen.name === 'map' && (
        <MapScreen
          fileName={screen.file.name}
          preview={screen.preview}
          onBack={() => setScreen({ name: 'upload' })}
          onConfirm={(plan) =>
            setScreen({
              ...screen,
              name: 'clean',
              plan,
              // Kept in state so the cleaning screen's summary job is not restarted on re-render.
              format: { encoding: screen.preview.encoding, delimiter: screen.preview.delimiter },
            })
          }
        />
      )}
      {screen.name === 'clean' && (
        <CleanScreen
          fileName={screen.file.name}
          file={screen.file}
          plan={screen.plan}
          format={screen.format}
          onBack={() => setScreen({ name: 'map', file: screen.file, preview: screen.preview })}
          onRun={(plan) => {
            const { file, format } = screen;
            setScreen({
              name: 'results',
              label: file.name,
              load: () => Promise.resolve({ source: file, plan, format }),
              // Saved as a new project when this browser lets the app keep data (S8).
              ...(storage === 'available'
                ? {
                    project: {
                      name: projectName(file.name),
                      sourceFileName: file.name,
                      map: defaultSegmentMap,
                    },
                  }
                : {}),
            });
          }}
        />
      )}
      {screen.name === 'results' && (
        <ResultsScreen
          label={screen.label}
          load={screen.load}
          onStartOver={start}
          {...(screen.project ? { project: screen.project } : {})}
        />
      )}
    </Page>
  );
}
