// "Segment detail" (APP_FLOW): who is in this segment, and what should I do? Primary action:
// Export, named after the segment ("Export Champions").
import type { Segment, SegmentSummary } from '@rfm-matrix/core';
import { useEffect, useState } from 'react';
import type { AnalysisSession } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { downloadFile } from '../components/download';
import { Notice } from '../components/Notice';
import { familyOf } from '../grid/families';
import { plural } from '../screens/plural';
import { CustomerList, pageSize } from './CustomerList';
import { exportFileName, type SegmentPage, type Sort, type SortKey } from './customer-table';

type Props = {
  segment: Segment;
  summary: SegmentSummary;
  session: AnalysisSession;
  analysisDate: string;
  hasEmail: boolean;
  onBack(): void;
  onExported(message: string): void;
};

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

export function SegmentScreen(props: Props) {
  const { segment, summary, session, analysisDate, hasEmail, onBack, onExported } = props;
  const [sort, setSort] = useState<Sort>({ key: 'spend', direction: 'desc' });
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<SegmentPage | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [exporting, setExporting] = useState(false);
  const family = familyOf(segment.id);

  useEffect(() => {
    let current = true;
    session.segmentPage(segment.id, sort, pageIndex, pageSize).then(
      (next) => current && setPage(next),
      (e: Error) => current && setError(e.message),
    );
    return () => {
      current = false;
    };
  }, [session, segment.id, sort, pageIndex]);

  function changeSort(key: SortKey) {
    setPageIndex(0);
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  }

  async function exportSegment() {
    setExporting(true);
    try {
      const { file, rows } = await session.exportSegment(segment.id, segment.name);
      const name = exportFileName(segment.name, analysisDate);
      downloadFile(file, name);
      onExported(`Exported ${name} · ${plural(rows, 'customer')}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  const tiles: [string, string][] = [
    ['Customers', summary.customers.toLocaleString('en-US')],
    ['Share of customers', percent(summary.customerShare)],
    ['Share of revenue', percent(summary.revenueShare)],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title font-semibold">{segment.name}</h1>
          <span className={`rounded-full px-2 py-0.5 text-small ${family.pill}`}>
            {family.name}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="quiet" onClick={onBack}>
            Back to grid
          </Button>
          <Button
            variant="primary"
            disabled={summary.customers === 0}
            loading={exporting}
            loadingLabel="Exporting…"
            onClick={() => void exportSegment()}
          >
            Export {segment.name}
          </Button>
        </div>
      </div>
      <section className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-6">
        <p>{segment.description}</p>
        <p className="font-semibold">Suggested action</p>
        <p className="text-text-secondary">{segment.suggestedAction}</p>
      </section>
      <ul aria-label="Segment summary" className="grid grid-cols-3 gap-3">
        {tiles.map(([label, value]) => (
          <li key={label} className="rounded-panel border border-border bg-surface px-4 py-3">
            <p className="text-small text-text-secondary">{label}</p>
            <p className="text-section font-semibold tabular-nums">{value}</p>
          </li>
        ))}
      </ul>
      {error && (
        <Notice tone="error" title="The customer list could not be loaded">
          <p>{error}</p>
        </Notice>
      )}
      {!error && summary.customers === 0 && (
        <Notice tone="info" title="No customers here right now">
          <p>
            {segment.name}: {segment.description.toLowerCase()} No customer in this analysis fits
            that today.
          </p>
        </Notice>
      )}
      {!error && page && page.total > 0 && (
        <CustomerList
          segmentName={segment.name}
          page={page}
          pageIndex={pageIndex}
          sort={sort}
          hasEmail={hasEmail}
          onSort={changeSort}
          onPage={setPageIndex}
        />
      )}
    </>
  );
}
