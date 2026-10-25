// What to tell a store owner when a file cannot be read (TRD §11): what happened and what to do.
import type { UnreadableKind } from '@rfm-matrix/io';

export const unreadableMessages: Record<UnreadableKind, { title: string; detail: string }> = {
  xlsx: {
    title: 'This looks like an Excel file',
    detail:
      'RFM Matrix reads CSV files for now. Open the file in Excel, Numbers or Google Sheets, save or download it as CSV, then upload the CSV.',
  },
  xls: {
    title: 'This looks like an older Excel file',
    detail:
      'RFM Matrix reads CSV files for now. Open the file in Excel, Numbers or Google Sheets, save or download it as CSV, then upload the CSV.',
  },
  binary: {
    title: 'This is not a text file',
    detail:
      "Choose your shop's order export in CSV format, for example from Shopify under Orders, then Export.",
  },
  empty: {
    title: 'This file is empty',
    detail: 'It has no rows to read. Export your orders again and upload the new file.',
  },
};
