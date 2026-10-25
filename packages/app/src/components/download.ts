// Saves a file the app made in this tab. The link points at memory in the browser (a blob: URL),
// so nothing is uploaded or fetched (ADR-0001).
export function downloadFile(file: Blob, name: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // Give the browser time to start the download before the memory is released.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
