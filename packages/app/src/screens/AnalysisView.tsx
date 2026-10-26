// A finished analysis: the grid, any segment's detail and export (S6), and the segment rules
// (S7). The worker that ran the analysis answers every question about it.
import {
  defaultSegmentMap,
  rfSegment,
  type SegmentMap,
  type SegmentsSummary,
} from '@rfm-matrix/core';
import { useState } from 'react';
import type { AnalysisHandle } from '../analysis/analysis-client';
import type { DoneMessage } from '../analysis/protocol';
import { Toast } from '../components/Toast';
import { GridPage } from '../grid/GridPage';
import { RulesScreen } from '../rules/RulesScreen';
import { SegmentScreen } from '../segment/SegmentScreen';

type Props = { result: DoneMessage; wallMs: number; hasEmail: boolean; handle: AnalysisHandle };

type View = { name: 'grid' } | { name: 'segment'; id: string } | { name: 'rules' };

export function AnalysisView({ result, wallMs, hasEmail, handle }: Props) {
  const [map, setMap] = useState<SegmentMap>(defaultSegmentMap);
  const [shown, setShown] = useState(result);
  const [view, setView] = useState<View>({ name: 'grid' });
  const [toast, setToast] = useState<string | null>(null);

  function saveRules(next: SegmentMap, segments: SegmentsSummary) {
    setMap(next);
    setShown((current) => ({
      ...current,
      segments,
      grid: current.grid.map((cell) => ({ ...cell, segmentId: rfSegment(next, cell.r, cell.f) })),
    }));
    setView({ name: 'grid' });
    setToast('Segment rules saved');
  }

  const segment = view.name === 'segment' && map.segments.find((s) => s.id === view.id);
  const summary = segment && shown.segments.segments.find((s) => s.id === segment.id);

  return (
    <>
      {view.name === 'grid' && (
        <GridPage
          result={shown}
          wallMs={wallMs}
          map={map}
          onOpenSegment={(id) => setView({ name: 'segment', id })}
          onEditRules={() => setView({ name: 'rules' })}
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
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
