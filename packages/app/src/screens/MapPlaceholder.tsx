// Stands in for "Map columns" until the S2 screen: runs the analysis when the guessed mapping
// is complete.
import { fieldLabels, validateMapping } from '@rfm-matrix/core';
import type { CsvPreview } from '@rfm-matrix/io';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { initialPlan } from '../mapping/initial-plan';

type Props = { fileName: string; preview: CsvPreview; onBack(): void; onRun(): void };

export function MapPlaceholder({ fileName, preview, onBack, onRun }: Props) {
  const { plan } = initialPlan(preview);
  const problems = validateMapping(plan.mapping, preview.header);
  const chosen = Object.entries(plan.mapping)
    .map(
      ([field, index]) =>
        `${fieldLabels[field as keyof typeof fieldLabels]}: ${preview.header[index]}`,
    )
    .join(', ');
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-semibold">Map columns</h1>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>
      {problems.length === 0 ? (
        <Notice tone="info" title={`Columns found in ${fileName}`}>
          <p>{chosen}</p>
        </Notice>
      ) : (
        <Notice tone="warning" title="Some columns could not be found">
          <p>{problems.join(' ')}</p>
        </Notice>
      )}
      <div>
        <Button variant="primary" disabled={problems.length > 0} onClick={onRun}>
          Run analysis
        </Button>
      </div>
    </>
  );
}
