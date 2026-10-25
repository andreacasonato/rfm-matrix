// A first guess at how to read a file, from its preview: preset, columns, dates and decimals.
import {
  type DetectedDateOrder,
  detectDateOrder,
  detectDecimal,
  detectPreset,
  guessMapping,
  type PresetId,
} from '@rfm-matrix/core';
import type { CsvPreview } from '@rfm-matrix/io';
import type { AnalysisPlan } from '../analysis/protocol';

export type InitialPlan = { preset: PresetId; dates: DetectedDateOrder; plan: AnalysisPlan };

const column = (rows: string[][], index: number | undefined) =>
  index === undefined ? [] : rows.map((row) => row[index] ?? '');

export function initialPlan(preview: CsvPreview, chosen?: PresetId): InitialPlan {
  const preset = chosen ?? detectPreset(preview.header);
  const mapping = guessMapping(preview.header, preset);
  const dates = detectDateOrder(column(preview.rows, mapping.orderedAt));
  return {
    preset,
    dates,
    plan: {
      mapping,
      read: {
        decimal: detectDecimal(column(preview.rows, mapping.amount)),
        // Only used for day/month/year values; ambiguous files must be confirmed by the user.
        dateOrder: dates === 'mdy' ? 'mdy' : 'dmy',
      },
      amountLevel: 'order',
    },
  };
}
