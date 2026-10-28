import { describe, expect, it } from 'vitest';
import { setCell } from './segment-edits';
import { maxMapFileLength, segmentMapFromFile, segmentMapToFile } from './segment-map-file';
import { defaultSegmentMap } from './segments';

const file = (cells: unknown, extra: object = {}) =>
  JSON.stringify({ format: 'rfm-matrix-segment-map', version: 1, cells, ...extra });

describe('segment map files (S7, PRD §6)', () => {
  it('round-trips an edited map', () => {
    const edited = setCell(defaultSegmentMap, { r: 5, f: 1, m: 2 }, 'champions');
    const result = segmentMapFromFile(segmentMapToFile(edited), defaultSegmentMap);
    expect(result).toEqual({ ok: true, map: edited });
  });

  it('keeps the segments of the app, so names and texts never come from a file', () => {
    const result = segmentMapFromFile(
      file(defaultSegmentMap.cells, { segments: [{ id: 'lost', name: '<img onerror=x>' }] }),
      defaultSegmentMap,
    );
    expect(result.ok && result.map.segments).toEqual(defaultSegmentMap.segments);
  });

  it.each([
    ['not JSON', '{"cells": [', 'This is not a rules file: it is not valid JSON.'],
    ['another JSON file', '{"name":"x"}', 'This is not an RFM Matrix rules file.'],
    ['a newer version', file([], { version: 2 }), 'made by a newer version of RFM Matrix'],
    ['cells that are not a list', file('lost'), 'The rules file has no list of 125 cells.'],
    ['too few cells', file(['lost']), 'The rules file has 1 cell; it needs exactly 125.'],
  ])('refuses %s with a plain message', (_name, text, problem) => {
    const result = segmentMapFromFile(text, defaultSegmentMap);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problems.join(' ')).toContain(problem);
  });

  it('names the first unknown segments, quoted and shortened, and counts the rest', () => {
    const cells: unknown[] = [...defaultSegmentMap.cells];
    const script = `<script>alert(1)</script>${'x'.repeat(100)}`;
    for (let i = 0; i < 8; i++) cells[i] = i === 0 ? script : 7;
    const result = segmentMapFromFile(file(cells), defaultSegmentMap);
    expect(result.ok).toBe(false);
    const problems = result.ok ? [] : result.problems;
    expect(problems[0]).toBe(
      `R1 F1 M1 points to an unknown segment "<script>alert(1)</script>xxxxxxxxxxxxxxx…".`,
    );
    expect(problems[1]).toBe('R1 F1 M2 points to an unknown segment "7".');
    expect(problems).toHaveLength(6);
    expect(problems[5]).toBe('…and 3 more problems.');
  });

  it('refuses a file too long to be a rules file without parsing it', () => {
    const result = segmentMapFromFile(' '.repeat(maxMapFileLength + 1), defaultSegmentMap);
    expect(result).toEqual({ ok: false, problems: ['This file is too large to be a rules file.'] });
  });
});
