// TRD §3: "UI frame during scoring: never blocked over 100 ms". Scoring runs from Run analysis
// to segment counts ready, so only main-thread tasks overlapping that window count.
export type LongTask = { startTime: number; duration: number };

export function longestTaskIn(tasks: LongTask[], window: { start: number; end: number }): number {
  return tasks
    .filter((t) => t.startTime < window.end && t.startTime + t.duration > window.start)
    .reduce((longest, t) => Math.max(longest, t.duration), 0);
}
