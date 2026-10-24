// Screen switching (ADR-0011: a small state machine, no router).
import type { CsvPreview } from '@rfm-matrix/io';
import { useEffect, useState } from 'react';
import { startPreview } from './analysis/worker-client';
import { Page } from './components/Page';
import { initialPlan } from './mapping/initial-plan';
import { MapPlaceholder } from './screens/MapPlaceholder';
import { type AnalysisInput, ResultsScreen } from './screens/ResultsScreen';
import { StartScreen } from './screens/StartScreen';
import { UploadScreen } from './screens/UploadScreen';
import { probeStorage, type StorageState } from './storage-probe';

type Screen =
  | { name: 'start' }
  | { name: 'upload' }
  | { name: 'map'; file: File; preview: CsvPreview }
  | { name: 'results'; label: string; load(): Promise<AnalysisInput> };

async function loadSample(): Promise<AnalysisInput> {
  // A static file of the app itself, same origin (ADR-0010 notes).
  const response = await fetch('sample-orders.csv');
  if (!response.ok) throw new Error(`The sample data could not be loaded (${response.status}).`);
  const source = await response.blob();
  // The sample goes through the same preview and guess as an uploaded file.
  const { preview } = await startPreview(source, {}, () => {}).result;
  return { source, plan: initialPlan(preview).plan, format: {} };
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });
  const [storage, setStorage] = useState<StorageState>('checking');
  useEffect(() => {
    void probeStorage().then(setStorage);
  }, []);

  const start = () => setScreen({ name: 'start' });

  return (
    <Page>
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
        <MapPlaceholder
          fileName={screen.file.name}
          preview={screen.preview}
          onBack={() => setScreen({ name: 'upload' })}
          onRun={() => {
            const { file, preview } = screen;
            setScreen({
              name: 'results',
              label: file.name,
              load: () =>
                Promise.resolve({
                  source: file,
                  plan: initialPlan(preview).plan,
                  format: { encoding: preview.encoding, delimiter: preview.delimiter },
                }),
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
