// Checks for the smaller parts of a project file (S9): column mapping, cleaning rules, scoring
// methods and segment IDs. Each returns a value rebuilt from checked parts, or undefined.
import type { CleaningRules } from './cleaning';
import type { FileCheck } from './file-checks';
import type { ReadSettings } from './order-row';
import type { AmountLevel } from './orders';
import type { Breakpoints } from './percentile';
import { type ColumnMapping, type Field, fieldLabels } from './presets';
import { type Dimension, type DimensionMethod, type ScoringMethods, validateBreaks } from './score';

export type FileMapping = {
  columns: ColumnMapping;
  columnNames?: Partial<Record<Field, string>>;
  read: ReadSettings;
  amountLevel: AmountLevel;
};

const fields = Object.keys(fieldLabels) as Field[];
export const dimensions: Dimension[] = ['r', 'f', 'm'];

export function mapping(c: FileCheck, path: string, value: unknown): FileMapping | undefined {
  const o = c.object(path, value);
  if (!o) return undefined;
  const columns = c.record(`${path}.columns`, o.columns, fields, (p, v) =>
    c.whole(p, v, 0, 10_000),
  );
  const names =
    o.columnNames === undefined
      ? undefined
      : c.record(`${path}.columnNames`, o.columnNames, fields, (p, v) => c.text(p, v, 500));
  const read = c.object(`${path}.read`, o.read);
  const decimal = read && c.oneOf(`${path}.read.decimal`, read.decimal, ['.', ','] as const);
  const dateOrder =
    read && c.oneOf(`${path}.read.dateOrder`, read.dateOrder, ['dmy', 'mdy'] as const);
  const amountLevel = c.oneOf(`${path}.amountLevel`, o.amountLevel, ['order', 'line'] as const);
  if (!columns || !decimal || !dateOrder || !amountLevel) return undefined;
  return {
    columns,
    ...(names ? { columnNames: names } : {}),
    read: { decimal, dateOrder },
    amountLevel,
  };
}

export function cleaning(c: FileCheck, path: string, value: unknown): CleaningRules | undefined {
  const o = c.object(path, value);
  if (!o) return undefined;
  const list = c.list(`${path}.excludedStatuses`, o.excludedStatuses, 1000);
  const excluded = list && c.each(`${path}.excludedStatuses`, list, (p, v) => c.text(p, v));
  const amountBasis = c.oneOf(`${path}.amountBasis`, o.amountBasis, ['gross', 'net'] as const);
  const subtractRefunds = c.boolean(`${path}.subtractRefunds`, o.subtractRefunds);
  let analysisDate: Date | undefined;
  if (o.analysisDate !== undefined) {
    const text = c.text(`${path}.analysisDate`, o.analysisDate, 40);
    if (text !== undefined && !Number.isNaN(Date.parse(text))) analysisDate = new Date(text);
    else if (text !== undefined) c.fail(`${path}.analysisDate`, 'must be a date and time.');
  }
  const lookbackDays =
    o.lookbackDays === undefined
      ? undefined
      : c.whole(`${path}.lookbackDays`, o.lookbackDays, 1, 36_500);
  if (!excluded || !amountBasis || subtractRefunds === undefined) return undefined;
  return {
    excludedStatuses: excluded,
    amountBasis,
    subtractRefunds,
    ...(analysisDate ? { analysisDate } : {}),
    ...(lookbackDays !== undefined ? { lookbackDays } : {}),
  };
}

export function breakpoints(c: FileCheck, path: string, value: unknown): Breakpoints | undefined {
  const list = c.list(path, value, 4, 4);
  const numbers = list && c.each(path, list, (p, v) => c.number(p, v));
  return numbers as Breakpoints | undefined;
}

export function method(
  c: FileCheck,
  path: string,
  d: Dimension,
  value: unknown,
): DimensionMethod | undefined {
  const o = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  if (o.method === 'quantile') return { method: 'quantile' };
  if (o.method !== 'fixed') return c.fail(path, 'must be a scoring method.');
  const breaks = breakpoints(c, `${path}.breaks`, o.breaks);
  if (!breaks) return undefined;
  const problems = validateBreaks(d, breaks);
  for (const problem of problems) c.fail(`${path}:`, problem);
  return problems.length ? undefined : { method: 'fixed', breaks };
}

export function scoring(c: FileCheck, path: string, value: unknown): ScoringMethods | undefined {
  const o = c.object(path, value);
  if (!o) return undefined;
  const [r, f, m] = dimensions.map((d) => method(c, `${path}.${d}`, d, o[d]));
  return r && f && m ? { r, f, m } : undefined;
}

export function segmentIds(
  c: FileCheck,
  path: string,
  value: unknown,
  known: Set<string>,
  length?: number,
) {
  const list = c.list(path, value, Math.max(length ?? 125, 125), length ?? 125);
  return (
    list &&
    c.each(path, list, (p, v) => {
      const id = c.text(p, v, 100);
      return id === undefined || known.has(id)
        ? id
        : c.fail(p, `is not a known segment: ${c.quote(id)}.`);
    })
  );
}
