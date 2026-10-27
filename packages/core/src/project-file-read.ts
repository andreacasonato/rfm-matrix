// The checks behind readProjectFile (S9): the project, its snapshots and their customers.
// Values are rebuilt from checked parts only, never copied from the file whole.
import type { CleaningCounts } from './cleaning';
import type { FileCheck } from './file-checks';
import type { Score } from './index';
import type { ProjectFile, ProjectFileLimits, ProjectFileSnapshot } from './project-file';
import {
  breakpoints,
  cleaning,
  dimensions,
  mapping,
  scoring,
  segmentIds,
} from './project-file-parts';

export type { FileMapping } from './project-file-parts';

/** One entry per customer in each list; `email` is null when no email column was mapped. */
export type CustomerColumns = {
  customerKey: string[];
  email: (string | null)[] | null;
  firstOrderAt: number[];
  lastOrderAt: number[];
  recencyDays: number[];
  frequency: number[];
  monetaryMinor: number[];
  r: Score[];
  f: Score[];
  m: Score[];
  segmentId: string[];
};

const countKeys = [
  'used',
  'status',
  'withoutDate',
  'afterAnalysisDate',
  'beforeWindow',
  'refundsApplied',
  'customersWithoutOrders',
] as const;

const allDefined = (...values: unknown[]) => values.every((v) => v !== undefined);

export function readProject(c: FileCheck, value: unknown, known: Set<string>) {
  const o = c.object('project', value);
  if (!o) return undefined;
  const name = c.text('project.name', o.name);
  const createdAt = c.whole('project.createdAt', o.createdAt, 0);
  const map = mapping(c, 'project.mapping', o.mapping);
  const rules = o.cleaning === undefined ? undefined : cleaning(c, 'project.cleaning', o.cleaning);
  const methods = o.scoring === undefined ? undefined : scoring(c, 'project.scoring', o.scoring);
  const cells = segmentIds(c, 'project.cells', o.cells, known);
  if (name === undefined || createdAt === undefined || !map || !cells) return undefined;
  const project: Omit<ProjectFile, 'snapshots'> = { name, createdAt, mapping: map, cells };
  if (rules) project.cleaning = rules;
  if (methods) project.scoring = methods;
  return project;
}

function customers(c: FileCheck, path: string, value: unknown, known: Set<string>, max: number) {
  const o = c.object(path, value);
  if (!o) return undefined;
  const keyList = c.list(`${path}.customerKey`, o.customerKey, max);
  if (!keyList) return undefined;
  const n = keyList.length;
  const seen = new Set<string>();
  const customerKey = c.each(`${path}.customerKey`, keyList, (p, v) => {
    const key = c.text(p, v, 512);
    if (key === undefined) return undefined;
    if (seen.has(key)) return c.fail(p, `repeats customer ${c.quote(key)}.`);
    seen.add(key);
    return key;
  });
  const column = <T>(key: string, check: (p: string, v: unknown) => T | undefined) => {
    const list = c.list(`${path}.${key}`, o[key], n, n);
    return list && c.each(`${path}.${key}`, list, check);
  };
  const email =
    o.email === null ? null : column('email', (p, v) => (v === null ? null : c.text(p, v, 320)));
  const time = (p: string, v: unknown) => c.whole(p, v);
  const score = (p: string, v: unknown) => c.whole(p, v, 1, 5) as Score | undefined;
  const result = {
    customerKey,
    email,
    firstOrderAt: column('firstOrderAt', time),
    lastOrderAt: column('lastOrderAt', time),
    recencyDays: column('recencyDays', (p, v) => c.whole(p, v, 0)),
    frequency: column('frequency', (p, v) => c.whole(p, v, 1)),
    monetaryMinor: column('monetaryMinor', (p, v) => c.whole(p, v)),
    r: column('r', score),
    f: column('f', score),
    m: column('m', score),
    segmentId: segmentIds(c, `${path}.segmentId`, o.segmentId, known, n),
  };
  return allDefined(...Object.values(result)) ? (result as CustomerColumns) : undefined;
}

function snapshot(
  c: FileCheck,
  path: string,
  value: unknown,
  known: Set<string>,
  limits: ProjectFileLimits,
): ProjectFileSnapshot | undefined {
  const o = c.object(path, value);
  if (!o) return undefined;
  const hash = c.text(`${path}.sourceFileHash`, o.sourceFileHash, 64);
  if (hash !== undefined && !/^[0-9a-f]{64}$/.test(hash)) {
    c.fail(`${path}.sourceFileHash`, 'must be a SHA-256 fingerprint.');
  }
  const config = c.object(`${path}.config`, o.config);
  const configMapping = config && mapping(c, `${path}.config.mapping`, config.mapping);
  const configCleaning =
    config?.cleaning === undefined
      ? undefined
      : cleaning(c, `${path}.config.cleaning`, config.cleaning);
  const configScoring = config && scoring(c, `${path}.config.scoring`, config.scoring);
  const bp = c.object(`${path}.breakpoints`, o.breakpoints);
  const [r, f, m] = dimensions.map((d) => bp && breakpoints(c, `${path}.breakpoints.${d}`, bp[d]));
  const rows = c.object(`${path}.rowCounts`, o.rowCounts);
  const [read, excluded, used] = (['read', 'excluded', 'used'] as const).map(
    (k) => rows && c.whole(`${path}.rowCounts.${k}`, rows[k], 0),
  );
  const report = c.object(`${path}.report`, o.report);
  const counts = report && c.object(`${path}.report.cleaning`, report.cleaning);
  const cleaningCounts = Object.fromEntries(
    countKeys.map((k) => [k, counts && c.whole(`${path}.report.cleaning.${k}`, counts[k], 0)]),
  ) as Partial<CleaningCounts>;
  const out = {
    createdAt: c.whole(`${path}.createdAt`, o.createdAt, 0),
    sourceFileName: c.text(`${path}.sourceFileName`, o.sourceFileName, 260),
    analysisDate: c.day(`${path}.analysisDate`, o.analysisDate),
    cells: segmentIds(c, `${path}.cells`, o.cells, known),
    orders: report && c.whole(`${path}.report.orders`, report.orders, 0),
    monetaryTotal: report && c.number(`${path}.report.monetaryTotal`, report.monetaryTotal),
    repeatCustomers: report && c.whole(`${path}.report.repeatCustomers`, report.repeatCustomers, 0),
    customers: customers(c, `${path}.customers`, o.customers, known, limits.maxCustomers),
  };
  const ready =
    allDefined(...Object.values(out), hash, configMapping, configScoring, r, f, m) &&
    allDefined(read, excluded, used, ...Object.values(cleaningCounts)) &&
    (config?.cleaning === undefined || configCleaning !== undefined);
  if (!ready || !configMapping || !configScoring || !r || !f || !m) return undefined;
  return {
    createdAt: out.createdAt as number,
    sourceFileName: out.sourceFileName as string,
    sourceFileHash: hash as string,
    analysisDate: out.analysisDate as string,
    config: {
      mapping: configMapping,
      ...(configCleaning ? { cleaning: configCleaning } : {}),
      scoring: configScoring,
    },
    cells: out.cells as string[],
    breakpoints: { r, f, m },
    rowCounts: { read: read as number, excluded: excluded as number, used: used as number },
    report: {
      orders: out.orders as number,
      monetaryTotal: out.monetaryTotal as number,
      repeatCustomers: out.repeatCustomers as number,
      cleaning: cleaningCounts as CleaningCounts,
    },
    customers: out.customers as CustomerColumns,
  };
}

export function readSnapshots(
  c: FileCheck,
  value: unknown,
  known: Set<string>,
  limits: ProjectFileLimits,
): ProjectFileSnapshot[] | undefined {
  const list = c.list('snapshots', value, limits.maxSnapshots);
  return list && c.each('snapshots', list, (p, v) => snapshot(c, p, v, known, limits));
}
