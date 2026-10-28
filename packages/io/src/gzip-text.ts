// Project files are gzip-compressed JSON (S9), using the browser's own CompressionStream, so no
// library is needed. Reading checks the size before reading and stops once the text passes a
// limit, so a small file that expands to gigabytes (a "zip bomb") cannot fill the memory.

export type GzipReadErrorKind = 'not-gzip' | 'too-large' | 'damaged';

export class GzipReadError extends Error {
  constructor(readonly kind: GzipReadErrorKind) {
    super(`This file cannot be read (${kind}).`);
    this.name = 'GzipReadError';
  }
}

/** A project of 12 monthly snapshots of 300,000 customers is about 450 MB of text. */
export const gzipLimits = { maxFileBytes: 200_000_000, maxTextBytes: 500_000_000 };

export function gzipText(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

export async function gunzipText(
  file: Blob,
  { maxFileBytes = gzipLimits.maxFileBytes, maxTextBytes = gzipLimits.maxTextBytes } = {},
): Promise<string> {
  if (file.size > maxFileBytes) throw new GzipReadError('too-large');
  const magic = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  if (magic[0] !== 0x1f || magic[1] !== 0x8b) throw new GzipReadError('not-gzip');

  const reader = file.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const parts: string[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxTextBytes) {
        await reader.cancel();
        throw new GzipReadError('too-large');
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
  } catch (error) {
    throw error instanceof GzipReadError ? error : new GzipReadError('damaged');
  }
  return parts.join('');
}
