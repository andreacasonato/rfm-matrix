import { describe, expect, it } from 'vitest';
import { longestTaskIn } from './long-tasks.ts';

describe('longestTaskIn', () => {
  const window = { start: 1000, end: 2000 };

  it('ignores tasks that finish before scoring starts, such as a cold first upload', () => {
    expect(longestTaskIn([{ startTime: 100, duration: 144 }], window)).toBe(0);
  });

  it('ignores tasks that start after the counts are ready, such as the save', () => {
    expect(longestTaskIn([{ startTime: 2000, duration: 300 }], window)).toBe(0);
  });

  it('counts the whole of a task that overlaps either edge of the window', () => {
    const tasks = [
      { startTime: 950, duration: 120 },
      { startTime: 1990, duration: 101 },
    ];
    expect(longestTaskIn(tasks, window)).toBe(120);
  });

  it('returns the longest task inside the window', () => {
    const tasks = [
      { startTime: 1100, duration: 60 },
      { startTime: 1500, duration: 140 },
      { startTime: 1800, duration: 55 },
    ];
    expect(longestTaskIn(tasks, window)).toBe(140);
  });
});
