// The sample file's orders end in September 2026. So the sample looks current, every date moves
// by the same whole number of days until the latest order falls on yesterday by the computer's
// calendar; the analysis date (the day after) is then today. Gaps between orders, and so every
// recency, score and segment, stay exactly as they are.

const isoStamp = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g;
const day = 86_400_000;

export function shiftSampleDates(csv: string, today: Date): string {
  const stamps = [...csv.matchAll(isoStamp)].map((m) => Date.parse(m[0]));
  if (stamps.length === 0) return csv;
  const latestDay = Math.floor(Math.max(...stamps) / day);
  // Analysis dates are UTC calendar days (ADR-0010); the local "today" names which one.
  const yesterday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 1) / day;
  const shift = (yesterday - latestDay) * day;
  return csv.replace(isoStamp, (stamp) =>
    new Date(Date.parse(stamp) + shift).toISOString().replace('.000Z', 'Z'),
  );
}
