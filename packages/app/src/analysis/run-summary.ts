// The worker's summary job for the cleaning screen (ADR-0013): one read through the plan,
// reporting orders by status and day so the screen can count exclusions before the analysis.
import type { AnalysisPlan, CsvFormat, WorkerMessage } from './protocol';
import { readOrders } from './read-orders';

export async function runSummary(
  source: Blob | string,
  plan: AnalysisPlan,
  format: CsvFormat,
  post: (message: WorkerMessage) => void,
): Promise<void> {
  try {
    const read = await readOrders(source, plan, {
      format,
      onProgress: (progress) => post({ type: 'summary-progress', ...progress }),
    });
    post({
      type: 'summary-done',
      summary: {
        profile: read.book.profile(),
        rowsRead: read.rowsRead,
        rowsUsed: read.rowsUsed,
        customers: read.book.customerCount,
      },
    });
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}
