import { describe, expect, it } from 'vitest';
import {
  type ProjectFile,
  projectFileToJson,
  projectFileVersion,
  readProjectFile,
} from './project-file';
import { defaultScoring } from './score';
import { setCell } from './segment-edits';
import { defaultSegmentMap } from './segments';

// biome-ignore lint/suspicious/noExplicitAny: tests edit the parsed file freely, as a user could by hand.
type JsonData = any;

const counts = {
  used: 3,
  status: 0,
  withoutDate: 0,
  afterAnalysisDate: 0,
  beforeWindow: 0,
  refundsApplied: 0,
  customersWithoutOrders: 0,
};
const mapping = {
  columns: { orderId: 0, customerId: 1, email: 2, orderedAt: 3, amount: 4 },
  columnNames: {
    orderId: 'Order',
    customerId: 'Customer',
    email: 'Email',
    orderedAt: 'Date',
    amount: 'Total',
  },
  read: { decimal: '.' as const, dateOrder: 'dmy' as const },
  amountLevel: 'order' as const,
};
const cleaning = {
  excludedStatuses: ['cancelled'],
  amountBasis: 'gross' as const,
  subtractRefunds: true,
  analysisDate: new Date('2026-10-01T00:00:00Z'),
  lookbackDays: 365,
};
const edited = setCell(defaultSegmentMap, { r: 5, f: 1, m: 'all' }, 'champions');

const project: ProjectFile = {
  name: 'my-shop',
  createdAt: 1_700_000_000_000,
  mapping,
  cleaning,
  scoring: defaultScoring,
  cells: edited.cells,
  snapshots: [
    {
      createdAt: 1_700_000_100_000,
      sourceFileName: 'october.csv',
      sourceFileHash: 'a'.repeat(64),
      analysisDate: '2026-10-01',
      config: { mapping, cleaning, scoring: defaultScoring },
      cells: edited.cells,
      breakpoints: { r: [10, 20, 30, 40], f: [1, 2, 3, 5], m: [10, 20, 30, 40] },
      rowCounts: { read: 4, excluded: 1, used: 3 },
      report: { orders: 3, monetaryTotal: 42.5, repeatCustomers: 1, cleaning: counts },
      customers: {
        customerKey: ['C1', 'C2'],
        email: ['a@example.test', null],
        firstOrderAt: [1_690_000_000_000, 1_695_000_000_000],
        lastOrderAt: [1_696_000_000_000, 1_695_000_000_000],
        recencyDays: [5, 70],
        frequency: [2, 1],
        monetaryMinor: [3000, 1250],
        r: [5, 2],
        f: [2, 1],
        m: [4, 1],
        segmentId: ['champions', 'about-to-sleep'],
      },
    },
  ],
};

/** The file as JSON.parse returns it, optionally changed. */
const fileData = (change: (data: JsonData) => void = () => {}) => {
  const data = JSON.parse(projectFileToJson(project, new Date('2026-10-27T00:00:00Z')));
  change(data);
  return data;
};
const read = (data: unknown, limits = {}) => readProjectFile(data, defaultSegmentMap, { limits });
const problemsOf = (data: unknown, limits = {}) => {
  const result = read(data, limits);
  return result.ok ? [] : result.problems;
};

describe('project files (S9, PRD story 9)', () => {
  it('round-trips a project with its rules and snapshots', () => {
    const data = fileData();
    expect(data).toMatchObject({
      format: 'rfm-matrix-project',
      schemaVersion: projectFileVersion,
      savedAt: '2026-10-27T00:00:00.000Z',
    });
    expect(read(data)).toEqual({ ok: true, project });
  });

  it('refuses files that are not RFM Matrix projects, or from a newer version', () => {
    expect(problemsOf('hello')).toEqual(['This is not an RFM Matrix project file.']);
    expect(problemsOf({ format: 'rfm-matrix-segment-map' })).toEqual([
      'This is not an RFM Matrix project file.',
    ]);
    expect(problemsOf(fileData((d) => (d.schemaVersion = projectFileVersion + 1)))).toEqual([
      'This project file was made by a newer version of RFM Matrix. Update the app to open it.',
    ]);
  });

  it.each([
    ['a missing name', (d: JsonData) => delete d.project.name, 'project.name must be text.'],
    [
      'a wrong type',
      (d: JsonData) => (d.project.scoring.r = 'quantile'),
      'project.scoring.r must be a scoring method.',
    ],
    [
      'an unknown field',
      (d: JsonData) => (d.project.mapping.columns.password = 3),
      'project.mapping.columns has an unknown field "password".',
    ],
    [
      'a score out of range',
      (d: JsonData) => (d.snapshots[0].customers.r[1] = 6),
      'snapshots[0].customers.r[1] must be a whole number from 1 to 5.',
    ],
    [
      'columns of different lengths',
      (d: JsonData) => d.snapshots[0].customers.frequency.pop(),
      'snapshots[0].customers.frequency must have 2 entries.',
    ],
    [
      'a customer listed twice',
      (d: JsonData) => (d.snapshots[0].customers.customerKey[1] = 'C1'),
      'snapshots[0].customers.customerKey[1] repeats customer "C1".',
    ],
    [
      'an unknown segment',
      (d: JsonData) => (d.snapshots[0].customers.segmentId[0] = 'vip'),
      'snapshots[0].customers.segmentId[0] is not a known segment: "vip".',
    ],
    [
      'rules with too few cells',
      (d: JsonData) => d.project.cells.pop(),
      'project.cells must have 125 entries.',
    ],
    [
      'unusable cut points',
      (d: JsonData) => (d.project.scoring.m = { method: 'fixed', breaks: [5, 1, 2, 3] }),
      'project.scoring.m: Each cut point must be larger than the one before.',
    ],
    [
      'a bad date',
      (d: JsonData) => (d.snapshots[0].analysisDate = '01/10/2026'),
      'snapshots[0].analysisDate must be a date like 2026-10-01.',
    ],
    [
      'a fraction of a cent',
      (d: JsonData) => (d.snapshots[0].customers.monetaryMinor[0] = 12.5),
      'snapshots[0].customers.monetaryMinor[0] must be a whole number.',
    ],
  ])('refuses %s, saying where', (_name, change, problem) => {
    expect(problemsOf(fileData(change))).toContain(problem);
  });

  it('keeps hostile text as plain text but limits its length', () => {
    const script = '<img src=x onerror="alert(1)">';
    const opened = read(fileData((d) => (d.project.name = script)));
    expect(opened.ok && opened.project.name).toBe(script);
    expect(problemsOf(fileData((d) => (d.project.name = 'x'.repeat(10_000))))).toEqual([
      'project.name is longer than 200 characters.',
    ]);
  });

  it('refuses more customers or snapshots than the limits', () => {
    expect(problemsOf(fileData(), { maxCustomers: 1 })).toEqual([
      'snapshots[0].customers.customerKey has more than 1 entries.',
    ]);
    expect(problemsOf(fileData(), { maxSnapshots: 0 })).toEqual([
      'snapshots has more than 0 entries.',
    ]);
  });

  it('lists the first five problems and counts the rest', () => {
    const problems = problemsOf(fileData((d) => d.snapshots[0].customers.r.fill(9)));
    expect(problems).toHaveLength(2);
    const many = problemsOf(
      fileData((d) => {
        for (const key of ['r', 'f', 'm']) d.snapshots[0].customers[key].fill(0);
      }),
    );
    expect(many).toHaveLength(6);
    expect(many[5]).toBe('…and 1 more problem.');
  });

  it('moves an older file forward through the migrations before checking it', () => {
    const old = fileData((d) => {
      d.schemaVersion = 0;
      d.project.title = d.project.name;
      delete d.project.name;
    });
    const migrations = {
      0: (data: JsonData) => {
        const { title, ...rest } = data.project;
        return { ...data, schemaVersion: 1, project: { ...rest, name: title } };
      },
    };
    const result = readProjectFile(old, defaultSegmentMap, { migrations });
    expect(result).toEqual({ ok: true, project });
  });
});
