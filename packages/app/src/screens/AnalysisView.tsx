// A finished analysis: the grid, any segment's detail and export (S6), the segment rules (S7),
// and saving on this device (S8). The worker that ran the analysis answers every question.
import {
  defaultSegmentMap,
  rfSegment,
  type SegmentMap,
  type SegmentsSummary,
} from '@rfm-matrix/core';
import { useEffect, useRef, useState } from 'react';
import type { AnalysisHandle } from '../analysis/analysis-client';
import type { DoneMessage, SaveResult } from '../analysis/protocol';
import { Toast } from '../components/Toast';
import { GridPage } from '../grid/GridPage';
import { HowScoresWork } from '../how/HowScoresWork';
import { MovementScreen } from '../movement/MovementScreen';
import { RulesScreen } from '../rules/RulesScreen';
import { SegmentScreen } from '../segment/SegmentScreen';
import { loadProject, type SnapshotSummary, saveProjectMap } from '../storage/projects';
import { SaveStatus } from './SaveStatus';

/** The project an analysis belongs to; `sourceFileName` marks a new analysis to save. */
export type ProjectContext = {
  id?: string;
  name: string;
  map: SegmentMap;
  sourceFileName?: string;
};

type Props = {
  result: DoneMessage;
  wallMs: number;
  hasEmail: boolean;
  handle: AnalysisHandle;
  /** None for the sample, which is never saved. */
  project?: ProjectContext;
  saveMap?: typeof saveProjectMap;
  load?: typeof loadProject;
};

type View =
  | { name: 'grid' }
  | { name: 'segment'; id: string }
  | { name: 'rules' }
  | { name: 'movement'; snapshots: SnapshotSummary[] }
  | { name: 'how' };

export function AnalysisView({
  result,
  wallMs,
  hasEmail,
  handle,
  project,
  saveMap = saveProjectMap,
  load = loadProject,
}: Props) {
  const [map, setMap] = useState<SegmentMap>(project?.map ?? defaultSegmentMap);
  const [shown, setShown] = useState(result);
  const [view, setView] = useState<View>({ name: 'grid' });
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveResult | 'saving' | null>(null);
  // Known once this analysis is saved, or from the start when a saved project was opened.
  const [projectId, setProjectId] = useState(project?.id);
  const saveStarted = useRef(false);

  useEffect(() => {
    if (!project?.sourceFileName || saveStarted.current) return;
    saveStarted.current = true;
    setSaved('saving');
    const { id, name, sourceFileName } = project;
    void handle.session
      .save({
        ...(id ? { projectId: id } : {}),
        projectName: name,
        sourceFileName,
        map: project.map,
      })
      .then((outcome) => {
        if (outcome.ok) setProjectId(outcome.projectId);
        setSaved(outcome);
      });
  }, [project, handle]);

  function saveRules(next: SegmentMap, segments: SegmentsSummary) {
    setMap(next);
    setShown((current) => ({
      ...current,
      segments,
      grid: current.grid.map((cell) => ({ ...cell, segmentId: rfSegment(next, cell.r, cell.f) })),
    }));
    setView({ name: 'grid' });
    if (!projectId) return setToast('Segment rules saved');
    void saveMap(projectId, next).then(
      () => setToast('Segment rules saved on this device'),
      () => setToast('Segment rules changed, but could not be saved on this device'),
    );
  }

  async function showMovement() {
    const loaded = projectId ? await load(projectId) : undefined;
    setView({ name: 'movement', snapshots: loaded?.snapshots ?? [] });
  }

  const segment = view.name === 'segment' && map.segments.find((s) => s.id === view.id);
  const summary = segment && shown.segments.segments.find((s) => s.id === segment.id);

  return (
    <>
      {saved && view.name === 'grid' && <SaveStatus state={saved} />}
      {view.name === 'grid' && (
        <GridPage
          result={shown}
          wallMs={wallMs}
          map={map}
          onOpenSegment={(id) => setView({ name: 'segment', id })}
          onEditRules={() => setView({ name: 'rules' })}
          onHowScores={() => setView({ name: 'how' })}
          {...(projectId ? { onMovement: () => void showMovement() } : {})}
        />
      )}
      {segment && summary && (
        <SegmentScreen
          segment={segment}
          summary={summary}
          session={handle.session}
          analysisDate={shown.analysisDate}
          hasEmail={hasEmail}
          onBack={() => setView({ name: 'grid' })}
          onExported={setToast}
        />
      )}
      {view.name === 'rules' && (
        <RulesScreen
          saved={map}
          segments={shown.segments}
          cellCustomers={shown.cellCustomers}
          session={handle.session}
          onSave={saveRules}
          onClose={() => setView({ name: 'grid' })}
        />
      )}
      {view.name === 'movement' && (
        <MovementScreen
          snapshots={view.snapshots}
          map={map}
          onBack={() => setView({ name: 'grid' })}
          onExported={setToast}
        />
      )}
      {view.name === 'how' && (
        <HowScoresWork
          scoring={shown.scoring}
          breakpoints={shown.breakpoints}
          cellCustomers={shown.cellCustomers}
          analysisDate={shown.analysisDate}
          onBack={() => setView({ name: 'grid' })}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
