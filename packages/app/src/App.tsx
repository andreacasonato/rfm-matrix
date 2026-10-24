// Screen switching (ADR-0011: a small state machine, no router).
import type { CsvPreview } from '@rfm-matrix/io';
import { useEffect, useState } from 'react';
import type { CsvFormat } from './analysis/protocol';
import { Page } from './components/Page';
import { MapPlaceholder } from './screens/MapPlaceholder';
import { ResultsScreen } from './screens/ResultsScreen';
import { StartScreen } from './screens/StartScreen';
import { shopifyColumns } from './screens/shopify-columns';
import { UploadScreen } from './screens/UploadScreen';
import { probeStorage, type StorageState } from './storage-probe';

type Screen =
  | { name: 'start' }
  | { name: 'upload' }
  | { name: 'map'; file: File; preview: CsvPreview }
  | { name: 'results'; label: string; load(): Promise<Blob>; format: CsvFormat };

async function loadSample(): Promise<Blob> {
  // A static file of the app itself, same origin (ADR-0010 notes).
  const response = await fetch('sample-orders.csv');
  if (!response.ok) throw new Error(`The sample data could not be loaded (${response.status}).`);
  return response.blob();
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
            setScreen({ name: 'results', label: 'Sample store', load: loadSample, format: {} })
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
              load: () => Promise.resolve(file),
              format: { encoding: preview.encoding, delimiter: preview.delimiter },
            });
          }}
        />
      )}
      {screen.name === 'results' && (
        <ResultsScreen
          label={screen.label}
          load={screen.load}
          format={screen.format}
          columns={shopifyColumns}
          onStartOver={start}
        />
      )}
    </Page>
  );
}
