// What to tell a store owner when a file cannot be read (TRD §11): what happened and what to do.
import { maxFileBytes } from '@rfm-matrix/io';
import type { ReadFailure } from '../analysis/protocol';

type Message = { title: string; detail: string };

const saveAsCsv =
  'RFM Matrix reads CSV files for now. Open the file in Excel, Numbers or Google Sheets, save or download it as CSV, then upload the CSV.';
const limit = `${maxFileBytes / 1_000_000} MB`;
const shorterRange =
  'Export a shorter date range, for example the last 12 months, and upload that.';

export const unreadableMessages: Record<ReadFailure, Message> = {
  xlsx: { title: 'This looks like an Excel file', detail: saveAsCsv },
  xls: { title: 'This looks like an older Excel file', detail: saveAsCsv },
  binary: {
    title: 'This is not a text file',
    detail:
      "Choose your shop's order export in CSV format, for example from Shopify under Orders, then Export.",
  },
  empty: {
    title: 'This file is empty',
    detail: 'It has no rows to read. Export your orders again and upload the new file.',
  },
  'too-large': {
    title: `This file is larger than ${limit}`,
    detail: `RFM Matrix reads files up to ${limit}, so your browser does not run out of memory. ${shorterRange}`,
  },
  'out-of-memory': {
    title: 'This file is too large for your browser',
    detail: `${shorterRange} Closing other tabs can also help.`,
  },
};

/** The message for a failure; running out of memory also says how far reading got. */
export function describeReadFailure(kind: ReadFailure, rowsRead: number): Message {
  const message = unreadableMessages[kind];
  if (kind !== 'out-of-memory') return message;
  const reached = `Reading stopped after ${rowsRead.toLocaleString('en-US')} rows.`;
  return { ...message, detail: `${reached} ${message.detail}` };
}
