// Messages between the page and the analysis worker (ADR-0003).

export type ColumnNames = { customer: string; orderId: string; orderedAt: string; amount: string };

export type StartMessage = { type: 'start'; file: Blob; columns: ColumnNames };

export type ProgressMessage = {
  type: 'progress';
  rowsRead: number;
  bytesRead: number;
  customers: number;
};

export type DoneMessage = {
  type: 'done';
  rowsRead: number;
  rowsUsed: number;
  invalidRows: number;
  customers: number;
  orders: number;
  monetaryTotal: number;
  problems: { row: number; message: string }[];
  elapsedMs: number;
};

export type ErrorMessage = { type: 'error'; message: string };

export type WorkerMessage = ProgressMessage | DoneMessage | ErrorMessage;
