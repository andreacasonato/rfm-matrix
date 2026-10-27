// Screen switching (ADR-0011: a small state machine, no router).
import type { CsvPreview } from '@rfm-matrix/io';
import { useEffect, useState } from 'react';
import type { AnalysisPlan, CsvFormat } from './analysis/protocol';
import { Page } from './components/Page';
import { ProjectDataScreen } from './data/ProjectDataScreen';
import { recordStorage } from './diagnostics/diagnostics';
import { type Onboarding, OnboardingScreen } from './onboarding/OnboardingScreen';
import { loadSample } from './sample';
import type { ProjectContext } from './screens/AnalysisView';
import { CleanScreen } from './screens/CleanScreen';
import { MapScreen } from './screens/MapScreen';
import { type AnalysisInput, ResultsScreen } from './screens/ResultsScreen';
import { StartScreen } from './screens/StartScreen';
import { UploadScreen } from './screens/UploadScreen';
import { type IntoProject, openSavedProject, projectForUpload } from './storage/open-project';
import { markOnboardingDone, readSettings } from './storage/settings';
import { useSavedProjects } from './storage/use-saved-projects';
import { probeStorage, type StorageState } from './storage-probe';

type Screen =
  | { name: 'start'; notice?: string }
  | { name: 'data' }
  | ({ name: 'upload' } & Carry)
  | ({ name: 'questions'; file: File; preview: CsvPreview } & Carry)
  | ({ name: 'map'; file: File; preview: CsvPreview } & Carry)
  | ({
      name: 'clean';
      file: File;
      preview: CsvPreview;
      plan: AnalysisPlan;
      format: CsvFormat;
    } & Carry)
  | {
      name: 'results';
      label: string;
      load(): Promise<AnalysisInput>;
      project?: ProjectContext;
      into?: IntoProject;
    };

/** Carried through upload: the saved project a new export goes into (journey 4), and the
 * first-upload answers (S11). */
type Carry = { into?: IntoProject; answers?: Onboarding };
const keep = ({ into, answers }: Carry) => ({
  ...(into ? { into } : {}),
  ...(answers ? { answers } : {}),
});

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });
  const [storage, setStorage] = useState<StorageState>('checking');
  useEffect(() => {
    void probeStorage().then((state) => {
      setStorage(state);
      recordStorage(state);
    });
  }, []);
  const projects = useSavedProjects(storage === 'available' && screen.name === 'start');
  // The first-upload questions, until answered or skipped once (S11).
  const [ask, setAsk] = useState(true);
  useEffect(() => {
    if (storage === 'available') void readSettings().then((s) => setAsk(!s.onboardingDone));
  }, [storage]);
  function questionsDone() {
    setAsk(false);
    if (storage === 'available') void markOnboardingDone();
  }

  async function openProject(id: string) {
    const opened = await openSavedProject(id);
    if (!opened) return;
    setScreen({
      name: 'results',
      label: opened.project.name,
      load: () => Promise.resolve(opened.input),
      project: opened.project,
      into: opened.into,
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
          onProjectOpened={(id) => void openProject(id)}
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
          onContinue={(file, preview) => {
            const next = { file, preview, ...keep(screen) };
            setScreen(
              !screen.into && ask ? { name: 'questions', ...next } : { name: 'map', ...next },
            );
          }}
        />
      )}
      {screen.name === 'questions' && (
        <OnboardingScreen
          fileName={screen.file.name}
          preview={screen.preview}
          onDone={(answers) => {
            questionsDone();
            setScreen({ ...screen, name: 'map', answers });
          }}
          onSkip={() => {
            questionsDone();
            setScreen({ ...screen, name: 'map' });
          }}
        />
      )}
      {screen.name === 'map' && (
        <MapScreen
          fileName={screen.file.name}
          preview={screen.preview}
          onBack={() => setScreen({ name: 'upload', ...keep(screen) })}
          {...(screen.into ? { previous: screen.into.mapping } : {})}
          {...(screen.answers ? { answers: screen.answers } : {})}
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
          onBack={() =>
            setScreen({
              name: 'map',
              file: screen.file,
              preview: screen.preview,
              ...keep(screen),
            })
          }
          {...(screen.into ? { previous: screen.into } : {})}
          {...(screen.answers ? { startDate: screen.answers } : {})}
          onRun={(chosen) => {
            const { file, format, into } = screen;
            const project = projectForUpload(file.name, into);
            const plan = { ...chosen, segmentMap: project.map };
            setScreen({
              name: 'results',
              label: file.name,
              load: () => Promise.resolve({ source: file, plan, format }),
              // Saved when this browser lets the app keep data (S8).
              ...(storage === 'available' ? { project } : {}),
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
          {...(screen.into
            ? { onUploadNew: () => setScreen({ name: 'upload', ...keep(screen) }) }
            : {})}
        />
      )}
    </Page>
  );
}
