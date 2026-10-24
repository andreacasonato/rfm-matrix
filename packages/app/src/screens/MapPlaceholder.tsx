// Stands in for "Map columns" until slice S2: runs the analysis when Shopify's names are present.
import type { CsvPreview } from '@rfm-matrix/io';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { hasShopifyColumns, shopifyColumns } from './shopify-columns';

type Props = { fileName: string; preview: CsvPreview; onBack(): void; onRun(): void };

export function MapPlaceholder({ fileName, preview, onBack, onRun }: Props) {
  const names = Object.values(shopifyColumns).join(', ');
  const ready = hasShopifyColumns(preview.header);
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-semibold">Map columns</h1>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>
      {ready ? (
        <Notice tone="info" title={`${fileName} has Shopify's order columns`}>
          <p>Customers are matched by {names}. Choosing other columns comes in a later update.</p>
        </Notice>
      ) : (
        <Notice tone="warning" title="Choosing columns is not available yet">
          <p>
            For now the file needs Shopify's column names: {names}. Column mapping for WooCommerce
            and other shops comes in the next update.
          </p>
        </Notice>
      )}
      <div>
        <Button variant="primary" disabled={!ready} onClick={onRun}>
          Run analysis
        </Button>
      </div>
    </>
  );
}
