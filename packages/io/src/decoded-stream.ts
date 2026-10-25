// Reads a Blob in byte slices through one streaming TextDecoder, so a character split across
// two slices is joined, not corrupted. Papa Parse's own file reader decodes every slice on its
// own; this object instead looks like the Node readable stream Papa also accepts.

export type TextEncodingName = 'utf-8' | 'windows-1252' | 'utf-16le' | 'utf-16be';

type Listener = (value?: unknown) => void;

export class DecodedBlobStream {
  readonly readable = true;
  bytesRead = 0;
  private readonly listeners = new Map<string, Set<Listener>>();
  private started = false;
  private stopped = false;
  private paused = false;
  private wake: (() => void) | undefined;

  constructor(
    private readonly blob: Blob,
    private readonly encoding: TextEncodingName,
    private readonly sliceBytes: number,
  ) {}

  read(): null {
    return null;
  }

  on(event: string, listener: Listener): this {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener);
    this.listeners.set(event, set);
    if (event === 'data' && !this.started) {
      this.started = true;
      queueMicrotask(() => void this.pump());
    }
    return this;
  }

  removeListener(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.wake?.();
  }

  /** Stops reading further slices, e.g. after the parser was aborted. */
  stop(): void {
    this.stopped = true;
    this.resume();
  }

  private emit(event: string, value?: unknown): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) listener(value);
  }

  private async pump(): Promise<void> {
    // Not fatal: undecodable bytes become U+FFFD rather than stopping the whole file.
    const decoder = new TextDecoder(this.encoding);
    try {
      for (let start = 0; start < this.blob.size; start += this.sliceBytes) {
        if (this.paused) await new Promise<void>((resolve) => (this.wake = resolve));
        if (this.stopped) return;
        const slice = this.blob.slice(start, start + this.sliceBytes);
        const text = decoder.decode(new Uint8Array(await slice.arrayBuffer()), { stream: true });
        this.bytesRead = Math.min(start + this.sliceBytes, this.blob.size);
        // An empty string tells Papa the stream ended, so only send text.
        if (text) this.emit('data', text);
      }
      if (this.stopped) return;
      const rest = decoder.decode();
      if (rest) this.emit('data', rest);
      this.emit('end');
    } catch (error) {
      this.emit('error', error);
    }
  }
}
