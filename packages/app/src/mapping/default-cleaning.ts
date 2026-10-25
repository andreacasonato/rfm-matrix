// The cleaning rules a file starts with (ADR-0013), before the user changes anything.
import { type CleaningRules, defaultExcludedStatuses, statusCounts } from '@rfm-matrix/core';
import type { AnalysisPlan, FileSummary } from '../analysis/protocol';

export function defaultCleaning(summary: FileSummary, plan: AnalysisPlan): CleaningRules {
  const statuses = statusCounts(summary.profile).map((s) => s.status);
  return {
    excludedStatuses: plan.mapping.status === undefined ? [] : defaultExcludedStatuses(statuses),
    amountBasis: 'gross',
    subtractRefunds: true,
  };
}
