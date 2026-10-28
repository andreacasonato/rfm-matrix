// "Try sample data": a static file of the app itself, same origin (ADR-0010 notes). It goes
// through the same preview, guess and default cleaning as an uploaded file, and is never saved.
import { startPreview, startSummary } from './analysis/worker-client';
import { defaultCleaning } from './mapping/default-cleaning';
import { initialPlan } from './mapping/initial-plan';
import type { AnalysisInput } from './screens/ResultsScreen';

export async function loadSample(): Promise<AnalysisInput> {
  const response = await fetch('sample-orders.csv');
  if (!response.ok) throw new Error(`The sample data could not be loaded (${response.status}).`);
  const source = await response.blob();
  const { preview } = await startPreview(source, {}, () => {}).result;
  const { plan } = initialPlan(preview);
  const { summary } = await startSummary(source, plan, {}, () => {}).result;
  return { source, plan: { ...plan, cleaning: defaultCleaning(summary, plan) }, format: {} };
}
