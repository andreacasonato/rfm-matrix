import { Upload } from 'lucide-react';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import type { StorageState } from '../storage-probe';

type Props = { onUpload(): void; onTrySample(): void; storage: StorageState };

export function StartScreen({ onUpload, onTrySample, storage }: Props) {
  return (
    <>
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
        </div>
      </section>
      {storage === 'unavailable' && (
        <Notice tone="warning" title="This browser is not letting the app store data">
          You can still analyse a file, but nothing will be saved when you close this tab.
        </Notice>
      )}
    </>
  );
}
