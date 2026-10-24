import { describe, expect, it } from 'vitest';
import type { WorkerMessage } from './protocol';
import { runPreview } from './run-preview';

async function run(file: Blob, format = {}, chunkSize?: number) {
  const messages: WorkerMessage[] = [];
  let clock = 0;
  await runPreview(file, format, (m) => messages.push(m), {
    now: () => (clock += 300),
    ...(chunkSize === undefined ? {} : { chunkSize }),
  });
  return messages;
}

const csv = `id,n\n${Array.from({ length: 30 }, (_, i) => `c${i},${i}`).join('\n')}\n`;

describe('runPreview', () => {
  it('posts the preview when the file has been read', async () => {
    const done = (await run(new Blob([csv]))).at(-1);
    expect(done).toMatchObject({
      type: 'preview-done',
      preview: { header: ['id', 'n'], rowCount: 30, delimiter: ',', encoding: 'utf-8' },
    });
    if (done?.type !== 'preview-done') throw new Error('expected preview-done');
    expect(done.preview.rows).toHaveLength(20);
  });

  it('posts progress while counting rows', async () => {
    const progress = (await run(new Blob([csv]), {}, 32)).filter(
      (m) => m.type === 'preview-progress',
    );
    expect(progress.length).toBeGreaterThan(1);
  });

  it('passes the chosen delimiter and encoding to the parser', async () => {
    const done = (await run(new Blob(['a;b\n1;2\n']), { delimiter: ',', encoding: 'utf-8' })).at(
      -1,
    );
    expect(done).toMatchObject({ preview: { header: ['a;b'], delimiter: ',' } });
  });

  it('names the kind of file it cannot read', async () => {
    const xlsx = new Blob([Uint8Array.from([0x50, 0x4b, 0x03, 0x04])]);
    expect(await run(xlsx)).toEqual([
      { type: 'error', message: 'This file cannot be read as CSV (xlsx).', unreadable: 'xlsx' },
    ]);
  });
});
