// Project files (S9, PRD story 9): a project with its rules and every snapshot, to keep or move
// to another computer. Customers are stored column by column, which is far smaller than one
// object per customer. Rules carry segment IDs only; names and texts come from the app.
import type { CleaningCounts, CleaningRules } from './cleaning';
import { FileCheck } from './file-checks';
import type { Breakpoints } from './percentile';
import type { CustomerColumns, FileMapping } from './project-file-read';
import { readProject, readSnapshots } from './project-file-read';
import type { ScoringMethods } from './score';
import type { SegmentMap } from './segments';

export type { CustomerColumns, FileMapping } from './project-file-read';

const format = 'rfm-matrix-project';
export const projectFileVersion = 1;

export type ProjectFileSnapshot = {
  createdAt: number;
  sourceFileName: string;
  sourceFileHash: string;
  analysisDate: string;
  config: { mapping: FileMapping; cleaning?: CleaningRules; scoring: ScoringMethods };
  cells: string[];
  breakpoints: { r: Breakpoints; f: Breakpoints; m: Breakpoints };
  rowCounts: { read: number; excluded: number; used: number };
  report: {
    orders: number;
    monetaryTotal: number;
    repeatCustomers: number;
    cleaning: CleaningCounts;
  };
  customers: CustomerColumns;
};

export type ProjectFile = {
  name: string;
  createdAt: number;
  mapping: FileMapping;
  cleaning?: CleaningRules;
  scoring?: ScoringMethods;
  /** The project's current rules: 125 segment IDs by `cellIndex`. */
  cells: string[];
  /** Oldest first. */
  snapshots: ProjectFileSnapshot[];
};

export type ProjectFileLimits = { maxSnapshots: number; maxCustomers: number };
export const projectFileLimits: ProjectFileLimits = { maxSnapshots: 500, maxCustomers: 5_000_000 };

export type ProjectFileResult =
  | { ok: true; project: ProjectFile }
  | { ok: false; problems: string[] };

/** Moves a file one version forward, keyed by the version it moves from. None exist yet. */
export type ProjectFileMigration = (data: Record<string, unknown>) => Record<string, unknown>;
export const projectFileMigrations: Record<number, ProjectFileMigration> = {};

export function projectFileToJson(project: ProjectFile, savedAt = new Date()): string {
  const { snapshots, ...rest } = project;
  return JSON.stringify({
    format,
    schemaVersion: projectFileVersion,
    savedAt: savedAt.toISOString(),
    project: rest,
    snapshots,
  });
}

const refuse = (...problems: string[]): ProjectFileResult => ({ ok: false, problems });
const shownProblems = 5;

type ReadOptions = {
  limits?: Partial<ProjectFileLimits>;
  migrations?: Record<number, ProjectFileMigration>;
};

/** Checks parsed JSON against the app's own segments (`base`) before anything uses it. */
export function readProjectFile(
  data: unknown,
  base: SegmentMap,
  { limits = {}, migrations = projectFileMigrations }: ReadOptions = {},
): ProjectFileResult {
  const isFile = typeof data === 'object' && data !== null && !Array.isArray(data);
  let file = (isFile ? data : {}) as Record<string, unknown>;
  if (file.format !== format) return refuse('This is not an RFM Matrix project file.');
  const version = file.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    return refuse('This project file has no version number, so it cannot be opened.');
  }
  if (version > projectFileVersion) {
    return refuse(
      'This project file was made by a newer version of RFM Matrix. Update the app to open it.',
    );
  }
  for (let v = version; v < projectFileVersion; v++) {
    const migrate = migrations[v];
    if (!migrate) return refuse(`This project file is from version ${v}, which cannot be opened.`);
    file = migrate(file);
  }

  const check = new FileCheck();
  const known = new Set(base.segments.map((s) => s.id));
  const all = { ...projectFileLimits, ...limits };
  const project = readProject(check, file.project, known);
  const snapshots = readSnapshots(check, file.snapshots, known, all);
  if (check.total > 0 || !project || !snapshots) {
    const rest = check.total - shownProblems;
    return refuse(
      ...check.problems.slice(0, shownProblems),
      ...(rest > 0 ? [`…and ${rest} more problem${rest === 1 ? '' : 's'}.`] : []),
    );
  }
  return { ok: true, project: { ...project, snapshots } };
}
