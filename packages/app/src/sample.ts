// "Try sample data": a static file of the app itself, same origin (ADR-0010 notes). It goes
// through the same preview, guess and default cleaning as an uploaded file, and is never saved.
// Its dates are moved so the latest order was yesterday (sample-dates.ts).
import { startPreview, startSummary } from './analysis/worker-client';
import { defaultCleaning } from './mapping/default-cleaning';
import { initialPlan } from './mapping/initial-plan';
import { shiftSampleDates } from './sample-dates';
import type { AnalysisInput } from './screens/ResultsScreen';

export async function loadSample(today = new Date()): Promise<AnalysisInput> {
  const response = await fetch('sample-orders.csv');
  if (!response.ok) throw new Error(`The sample data could not be loaded (${response.status}).`);
  const text = shiftSampleDates(await response.text(), today);
  const source = new Blob([text], { type: 'text/csv' });
  const { preview } = await startPreview(source, {}, () => {}).result;
  const { plan } = initialPlan(preview);
  const { summary } = await startSummary(source, plan, {}, () => {}).result;
  return { source, plan: { ...plan, cleaning: defaultCleaning(summary, plan) }, format: {} };
}
