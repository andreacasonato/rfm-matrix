// Rules files: a segment map saved to share or reuse (S7). A file only says which segment each
// of the 125 cells belongs to, by ID; names and texts always come from the app, so nothing in
// a file is ever shown except as quoted, shortened plain text in a problem (PRD §6).
import type { Score } from './index';
import { type SegmentMap, validateMap } from './segments';

const format = 'rfm-matrix-segment-map';
const version = 1;
/** A real rules file is about 3 KB. */
export const maxMapFileLength = 64 * 1024;
const shownProblems = 5;

export type MapFileResult = { ok: true; map: SegmentMap } | { ok: false; problems: string[] };

export function segmentMapToFile(map: SegmentMap): string {
  return `${JSON.stringify({ format, version, cells: map.cells }, null, 2)}\n`;
}

const fail = (...problems: string[]): MapFileResult => ({ ok: false, problems });

const quote = (value: unknown) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `"${text.length > 40 ? `${text.slice(0, 40)}…` : text}"`;
};

const cellName = (i: number) => {
  const [r, f, m] = [Math.floor(i / 25), Math.floor(i / 5) % 5, i % 5].map((n) => n + 1);
  return `R${r as Score} F${f as Score} M${m as Score}`;
};

/** Reads a rules file against the app's own segments (`base`). */
export function segmentMapFromFile(text: string, base: SegmentMap): MapFileResult {
  if (text.length > maxMapFileLength) return fail('This file is too large to be a rules file.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('This is not a rules file: it is not valid JSON.');
  }
  const file = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  if (file.format !== format) return fail('This is not an RFM Matrix rules file.');
  if (typeof file.version !== 'number' || file.version > version) {
    return fail('This rules file was made by a newer version of RFM Matrix. Update the app.');
  }
  const cells = file.cells;
  if (!Array.isArray(cells)) return fail('The rules file has no list of 125 cells.');
  if (cells.length !== 125) {
    const noun = cells.length === 1 ? 'cell' : 'cells';
    return fail(`The rules file has ${cells.length} ${noun}; it needs exactly 125.`);
  }
  const known = new Set(base.segments.map((s) => s.id));
  const problems = cells.flatMap((id: unknown, i) =>
    typeof id === 'string' && known.has(id)
      ? []
      : [`${cellName(i)} points to an unknown segment ${quote(id)}.`],
  );
  if (problems.length > 0) {
    const rest = problems.length - shownProblems;
    return fail(
      ...problems.slice(0, shownProblems),
      ...(rest > 0 ? [`…and ${rest} more problems.`] : []),
    );
  }
  const map: SegmentMap = { segments: base.segments, cells: cells as string[] };
  const validation = validateMap(map);
  return validation.ok ? { ok: true, map } : fail(...validation.problems);
}
