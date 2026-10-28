import { type CustomerScore, defaultSegmentMap, type Score, setCell } from '@rfm-matrix/core';
import { describe, expect, it } from 'vitest';
import { buildCustomerTable } from './customer-table';
import { handleSessionRequest } from './session';

const scores: CustomerScore[] = ['champions', 'champions', 'lost'].map((segmentId, i) => ({
  customerKey: `c${i}`,
  recencyDays: i,
  frequency: 1,
  monetary: 10 * (i + 1),
  r: 5 as Score,
  f: 1 as Score,
  m: 1 as Score,
  segmentId,
}));
const table = buildCustomerTable(scores, false);

describe('handleSessionRequest (worker side of segment detail)', () => {
  it('applies a new map and answers with the new segment summary (S7)', async () => {
    const own = buildCustomerTable(scores, false);
    const map = setCell(defaultSegmentMap, { r: 5, f: 1, m: 'all' }, 'lost');
    const reply = await handleSessionRequest(own, { type: 'apply-map', requestId: 3, map });
    if (reply.type !== 'map-applied') throw new Error(`expected map-applied, got ${reply.type}`);
    expect(reply.requestId).toBe(3);
    expect(reply.segments.segments.find((s) => s.id === 'lost')?.customers).toBe(3);
  });

  it('refuses an invalid map and keeps the old segments', async () => {
    const own = buildCustomerTable(scores, false);
    const map = { ...defaultSegmentMap, cells: defaultSegmentMap.cells.slice(1) };
    const reply = await handleSessionRequest(own, { type: 'apply-map', requestId: 4, map });
    expect(reply).toMatchObject({ type: 'error', requestId: 4 });
    expect(own.segmentIds).toEqual(['champions', 'lost']);
  });

  it('answers a page request with the request id', async () => {
    const reply = await handleSessionRequest(table, {
      type: 'segment-page',
      requestId: 7,
      segmentId: 'champions',
      sort: { key: 'spend', direction: 'desc' },
      page: 0,
      pageSize: 50,
    });
    expect(reply).toMatchObject({ type: 'segment-page-done', requestId: 7, page: { total: 2 } });
  });

  it('answers an export request with a CSV file and its row count', async () => {
    const reply = await handleSessionRequest(table, {
      type: 'export',
      requestId: 8,
      segmentId: 'champions',
      segmentName: 'Champions',
    });
    if (reply.type !== 'export-done') throw new Error(`expected export-done, got ${reply.type}`);
    expect(reply).toMatchObject({ requestId: 8, rows: 2 });
    expect(reply.file.type).toBe('text/csv;charset=utf-8');
    expect(await reply.file.text()).toContain('c1,1,1,20.00');
  });

  it('reports a request that arrives before any analysis finished', async () => {
    const reply = await handleSessionRequest(undefined, {
      type: 'export',
      requestId: 9,
      segmentId: 'champions',
      segmentName: 'Champions',
    });
    expect(reply).toEqual({
      type: 'error',
      requestId: 9,
      message: 'No finished analysis to read from.',
    });
  });
});
