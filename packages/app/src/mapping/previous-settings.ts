// Journey 4, "Monthly check": a new export into a saved project starts from that project's
// settings. Columns are found again by their header names, since exports may reorder them.
import type {
  CleaningRules,
  ColumnMapping,
  Dimension,
  Field,
  ScoringMethods,
} from '@rfm-matrix/core';
import type { Choices } from '../screens/CleaningOptions';
import type { StoredMapping } from '../storage/schema';
import { defaultScoringChoices, type ScoringChoices } from '../thresholds/choices';

export type ColumnNames = Partial<Record<Field, string>>;

export function columnNamesOf(mapping: ColumnMapping, header: string[]): ColumnNames {
  const names: ColumnNames = {};
  for (const [field, index] of Object.entries(mapping) as [Field, number | undefined][]) {
    const name = index === undefined ? undefined : header[index];
    if (name !== undefined) names[field] = name;
  }
  return names;
}

/** The previous mapping by column name; `missing` lists fields whose column is gone. */
export function mappingFromPrevious(header: string[], previous: StoredMapping) {
  const mapping: ColumnMapping = {};
  const missing: Field[] = [];
  for (const [field, name] of Object.entries(previous.columnNames ?? {}) as [Field, string][]) {
    const index = header.indexOf(name);
    if (index >= 0) mapping[field] = index;
    else missing.push(field);
  }
  return { mapping, missing };
}

const lookbackOptions = new Set(['365', '730']);

/** Cleaning choices from saved rules; the analysis date goes back to the file's latest order. */
export function choicesFromRules(rules: CleaningRules): Choices {
  const days = rules.lookbackDays === undefined ? '' : String(rules.lookbackDays);
  const preset = days === '' || lookbackOptions.has(days);
  return {
    excluded: new Set(rules.excludedStatuses),
    basis: rules.amountBasis,
    subtractRefunds: rules.subtractRefunds,
    dateMode: 'latest',
    customDate: '',
    lookback: preset ? days : 'custom',
    customDays: preset ? '' : days,
  };
}

export function scoringChoicesFrom(methods: ScoringMethods): ScoringChoices {
  const choice = (d: Dimension) => {
    const method = methods[d];
    return method.method === 'fixed'
      ? { method: 'fixed' as const, breaks: method.breaks.map(String) }
      : { method: 'quantile' as const, breaks: defaultScoringChoices[d].breaks };
  };
  return { r: choice('r'), f: choice('f'), m: choice('m') };
}
