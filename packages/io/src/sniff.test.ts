import { describe, expect, it } from 'vitest';
import { sniffBytes } from './sniff';

const bytes = (...values: number[]) => Uint8Array.from(values);
const utf8 = (text: string) => new TextEncoder().encode(text);

describe('sniffBytes', () => {
  it.each([
    ['plain ASCII', utf8('a,b\n1,2\n'), { kind: 'text', encoding: 'utf-8' }],
    ['UTF-8 with accents', utf8('city\nZürich\n'), { kind: 'text', encoding: 'utf-8' }],
    ['a UTF-8 BOM', bytes(0xef, 0xbb, 0xbf, 0x61), { kind: 'text', encoding: 'utf-8' }],
    [
      'Windows-1252 accents',
      bytes(0x43, 0x61, 0x66, 0xe9, 0x0a),
      { kind: 'text', encoding: 'windows-1252' },
    ],
    ['a UTF-16LE BOM', bytes(0xff, 0xfe, 0x61, 0x00), { kind: 'text', encoding: 'utf-16le' }],
    ['a UTF-16BE BOM', bytes(0xfe, 0xff, 0x00, 0x61), { kind: 'text', encoding: 'utf-16be' }],
    ['an XLSX (zip) signature', bytes(0x50, 0x4b, 0x03, 0x04, 0x14), { kind: 'xlsx' }],
    [
      'an old XLS signature',
      bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1),
      { kind: 'xls' },
    ],
    [
      'NUL bytes without a UTF-16 BOM',
      bytes(0x89, 0x50, 0x4e, 0x47, 0x00, 0x00),
      { kind: 'binary' },
    ],
    ['no bytes', bytes(), { kind: 'empty' }],
  ])('recognises %s', (_label, input, expected) => {
    expect(sniffBytes(input)).toEqual(expected);
  });

  it('does not mistake a UTF-8 character cut off at the end of the sample for Windows-1252', () => {
    const sample = utf8('name\nZürich').slice(0, -4); // ends inside "ü"
    expect(sniffBytes(sample)).toEqual({ kind: 'text', encoding: 'utf-8' });
  });
});
