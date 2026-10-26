// The file's fingerprint for `sourceFileHash` (ADR-0019): SHA-256 of its size and its first and
// last 4 MB. Browsers cannot hash a stream, and hashing a 300 MB file whole would hold all of it
// in memory, so this is enough to notice the same export imported twice.
const partBytes = 4 * 1024 * 1024;

export async function fileFingerprint(source: Blob | string, part = partBytes): Promise<string> {
  const file = typeof source === 'string' ? new Blob([source]) : source;
  const head = file.slice(0, Math.min(part, file.size));
  const tail = file.slice(Math.max(part, file.size - part), file.size);
  const bytes = await new Blob([`${file.size}:`, head, tail]).arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
