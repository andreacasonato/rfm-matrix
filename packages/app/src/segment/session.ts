// The worker's answers about a finished analysis: one page of a segment, or a segment's CSV.
import type { SessionReply, SessionRequest } from '../analysis/protocol';
import { type CustomerTable, segmentCsv, segmentPage, segmentRows } from './customer-table';

export async function handleSessionRequest(
  table: CustomerTable | undefined,
  request: SessionRequest,
): Promise<SessionReply> {
  const { requestId } = request;
  if (!table) return { type: 'error', requestId, message: 'No finished analysis to read from.' };
  if (request.type === 'segment-page') {
    const page = segmentPage(
      table,
      request.segmentId,
      request.sort,
      request.page,
      request.pageSize,
    );
    return { type: 'segment-page-done', requestId, page };
  }
  const rows = segmentRows(table, request.segmentId);
  const csv = segmentCsv(table, rows, request.segmentName);
  // A Blob is passed to the page by reference, so even a large export is not copied.
  const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  return { type: 'export-done', requestId, file, rows: rows.length };
}
