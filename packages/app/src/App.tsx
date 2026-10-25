// Screen switching (ADR-0011: a small state machine, no router).
import type { CsvPreview } from '@rfm-matrix/io';
import { useEffect, useState } from 'react';
import type { AnalysisPlan, CsvFormat } from './analysis/protocol';
import { startPreview, startSummary } from './analysis/worker-client';
import { Page } from './components/Page';
import { defaultCleaning } from './mapping/default-cleaning';
import { initialPlan } from './mapping/initial-plan';
import { CleanScreen } from './screens/CleanScreen';
import { MapScreen } from './screens/MapScreen';
import { type AnalysisInput, ResultsScreen } from './screens/ResultsScreen';
import { StartScreen } from './screens/StartScreen';
import { UploadScreen } from './screens/UploadScreen';
import { probeStorage, type StorageState } from './storage-probe';

type Screen =
  | { name: 'start' }
  | { name: 'upload' }
  | { name: 'map'; file: File; preview: CsvPreview }
  | { name: 'clean'; file: File; preview: CsvPreview; plan: AnalysisPlan; format: CsvFormat }
  | { name: 'results'; label: string; load(): Promise<AnalysisInput> };

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
            });
          }}
        />
      )}
      {screen.name === 'results' && (
        <ResultsScreen label={screen.label} load={screen.load} onStartOver={start} />
      )}
    </Page>
  );
}
