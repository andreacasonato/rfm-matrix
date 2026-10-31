// The worker's analysis job, kept free of worker globals so it can be tested in Node. It posts
// the result and returns every scored customer for the worker to keep.
import {
  applySegments,
  type CleaningCounts,
  type CleaningRules,
  defaultScoring,
  defaultSegmentMap,
  gridCells,
  type ScoreResult,
  type ScoringMethods,
  score,
  summariseSegments,
} from '@rfm-matrix/core';
import { buildCustomerTable, type CustomerTable } from '../segment/customer-table';
import { cellCustomers } from '../segment/resegment';
import type { AnalysisPlan, CsvFormat, WorkerMessage } from './protocol';
import { readOrders } from './read-orders';
import { errorMessage } from './worker-error';

type Options = { now?: () => number; chunkSize?: number; format?: CsvFormat };

/** What the worker keeps after an analysis: the customers, and what saving needs (S8). */
export type Analysis = { table: CustomerTable; meta?: AnalysisMeta; saved?: SavedAs };
/** Where the analysis is saved on this device, once it is (S8), so new thresholds update it. */
export type SavedAs = { projectId: string; snapshotId: string };
export type AnalysisMeta = {
  source: Blob | string;
  plan: AnalysisPlan;
  scoring: ScoringMethods;
  analysisDate: string;
  breakpoints: ScoreResult['breakpoints'];
  rowCounts: { read: number; excluded: number; used: number };
  report: {
    orders: number;
    monetaryTotal: number;
    repeatCustomers: number;
    cleaning: CleaningCounts;
  };
};

// Until the user chooses on the cleaning screen, every order counts.
const keepAll: CleaningRules = {
  excludedStatuses: [],
  amountBasis: 'gross',
  subtractRefunds: true,
};

export async function runAnalysis(
  source: Blob | string,
  plan: AnalysisPlan,
  post: (message: WorkerMessage) => void,
  { now = () => performance.now(), chunkSize, format = {} }: Options = {},
): Promise<Analysis | undefined> {
  const started = now();
  try {
    const read = await readOrders(source, plan, {
      format,
      now,
      ...(chunkSize === undefined ? {} : { chunkSize }),
      onProgress: (progress) => post({ type: 'progress', ...progress }),
    });
    const { customers, counts, analysisDate } = read.book.finish(plan.cleaning ?? keepAll);
    const scoring = plan.scoring ?? defaultScoring;
    const scores = score(customers, { scoring, ...(analysisDate ? { analysisDate } : {}) });
    const map = plan.segmentMap ?? defaultSegmentMap;
    const segmented = applySegments(scores.customers, map);
    let monetaryTotal = 0;
    let repeatCustomers = 0;
    for (const customer of customers) {
      monetaryTotal += customer.monetary;
      if (customer.orderCount >= 2) repeatCustomers++;
    }
    const table = buildCustomerTable(segmented, plan.mapping.email !== undefined, customers);
    const analysisDay = scores.analysisDate.toISOString().slice(0, 10);
    post({
      type: 'done',
      rowsRead: read.rowsRead,
      rowsUsed: read.rowsUsed,
      invalidRows: read.rowsRead - read.rowsUsed,
      customers: customers.length,
      orders: counts.used,
      monetaryTotal,
      cleaning: counts,
      scoring,
      problems: read.problems.slice(0, 10),
      analysisDate: analysisDay,
      segments: summariseSegments(segmented, map),
      grid: gridCells(segmented, map),
      cellCustomers: cellCustomers(table),
      breakpoints: scores.breakpoints,
      repeatCustomers,
      elapsedMs: now() - started,
    });
    // Kept by the worker for segment detail and export, never sent to the page whole (S6).
    return {
      table,
      meta: {
        source,
        plan,
        scoring,
        analysisDate: analysisDay,
        breakpoints: scores.breakpoints,
        rowCounts: {
          read: read.rowsRead,
          excluded: read.rowsRead - read.rowsUsed,
          used: read.rowsUsed,
        },
        report: { orders: counts.used, monetaryTotal, repeatCustomers, cleaning: counts },
      },
    };
  } catch (error) {
    post(errorMessage(error));
    return undefined;
  }
}
