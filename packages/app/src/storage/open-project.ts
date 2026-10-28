// Opening a saved project (S8): its latest snapshot to show, and the settings its next export
// starts from (journey 4).
import {
  type CleaningRules,
  defaultSegmentMap,
  type ScoringMethods,
  type SegmentMap,
} from '@rfm-matrix/core';
import type { ProjectContext } from '../screens/AnalysisView';
import type { AnalysisInput } from '../screens/ResultsScreen';
import { loadProject } from './projects';
import type { StoredMapping } from './schema';

/** A saved project a new export goes into, with the settings to start from. */
export type IntoProject = {
  id: string;
  name: string;
  map: SegmentMap;
  mapping: StoredMapping;
  cleaning?: CleaningRules;
  scoring?: ScoringMethods;
};

export type OpenedProject = { input: AnalysisInput; project: ProjectContext; into: IntoProject };

/** "orders-2026.csv" → "orders-2026": the name of a new project. */
const projectName = (fileName: string) => fileName.replace(/\.[^.]+$/, '') || fileName;

/** Where an uploaded file's analysis is saved: a new project, or the one it was added to. */
export function projectForUpload(fileName: string, into?: IntoProject): ProjectContext {
  return into
    ? { id: into.id, name: into.name, map: into.map, sourceFileName: fileName }
    : { name: projectName(fileName), map: defaultSegmentMap, sourceFileName: fileName };
}

export async function openSavedProject(id: string): Promise<OpenedProject | undefined> {
  const loaded = await loadProject(id);
  const latest = loaded?.snapshots.at(-1);
  if (!loaded || !latest) return undefined;
  const { project, map } = loaded;
  const { columns } = project.columnMapping;
  return {
    input: {
      snapshotId: latest.id,
      map,
      hasEmail: columns.email !== undefined && columns.customerId !== undefined,
    },
    project: { id: project.id, name: project.name, map },
    into: {
      id: project.id,
      name: project.name,
      map,
      mapping: project.columnMapping,
      ...(project.cleaningRules ? { cleaning: project.cleaningRules } : {}),
      ...(project.scoringConfig ? { scoring: project.scoringConfig } : {}),
    },
  };
}
