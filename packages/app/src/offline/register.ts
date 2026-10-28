// Starts the service worker that keeps the app working offline (ADR-0020). A browser that refuses
// it, such as a private window, still runs the app online, so a refusal is not an error.
type Container = { register(url: string): Promise<unknown> };

export function registerOffline(container: Container | undefined) {
  container?.register('./sw.js').catch(() => {});
}
