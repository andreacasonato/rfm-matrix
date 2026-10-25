// Guesses what a file is from its first bytes: a spreadsheet, binary data, or text in which
// encoding. Text without a byte-order mark is UTF-8 if it decodes cleanly, else Windows-1252.
import type { TextEncodingName } from './decoded-stream';

export type Sniff =
  | { kind: 'text'; encoding: TextEncodingName }
  | { kind: 'xlsx' | 'xls' | 'binary' | 'empty' };

export const sniffSampleBytes = 64 * 1024;

const startsWith = (bytes: Uint8Array, prefix: number[]) =>
  prefix.every((value, i) => bytes[i] === value);

export function sniffBytes(bytes: Uint8Array): Sniff {
  if (bytes.length === 0) return { kind: 'empty' };
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return { kind: 'xlsx' };
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return { kind: 'xls' };
  if (startsWith(bytes, [0xff, 0xfe])) return { kind: 'text', encoding: 'utf-16le' };
  if (startsWith(bytes, [0xfe, 0xff])) return { kind: 'text', encoding: 'utf-16be' };
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) return { kind: 'text', encoding: 'utf-8' };
  if (bytes.includes(0)) return { kind: 'binary' };
  try {
    // stream: true tolerates a character cut off at the end of the sample.
    new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: true });
    return { kind: 'text', encoding: 'utf-8' };
  } catch {
    return { kind: 'text', encoding: 'windows-1252' };
  }
}

export async function sniffFile(file: Blob): Promise<Sniff> {
  return sniffBytes(new Uint8Array(await file.slice(0, sniffSampleBytes).arrayBuffer()));
}
