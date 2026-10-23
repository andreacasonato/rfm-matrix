// Samples the resident memory of every descendant of a process, not the process itself
// (macOS and Linux `ps`). Used to measure the browser that Playwright starts as our child.
import { execFileSync } from 'node:child_process';

function descendantsRssBytes(rootPid: number): number {
  const table = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,rss='], { encoding: 'utf8' });
  const children = new Map<number, number[]>();
  const rss = new Map<number, number>();
  for (const line of table.trim().split('\n')) {
    const [pid, ppid, kb] = line.trim().split(/\s+/).map(Number);
    if (pid === undefined || ppid === undefined || kb === undefined) continue;
    rss.set(pid, kb * 1024);
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  let total = 0;
  const queue = [...(children.get(rootPid) ?? [])];
  for (let pid = queue.pop(); pid !== undefined; pid = queue.pop()) {
    total += rss.get(pid) ?? 0;
    queue.push(...(children.get(pid) ?? []));
  }
  return total;
}

export function sampleMemory(rootPid: number, everyMs = 250): () => number {
  let peak = descendantsRssBytes(rootPid);
  const timer = setInterval(() => {
    peak = Math.max(peak, descendantsRssBytes(rootPid));
  }, everyMs);
  return () => {
    clearInterval(timer);
    return peak;
  };
}
