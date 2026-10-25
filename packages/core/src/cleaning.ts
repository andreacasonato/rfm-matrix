// Which orders count (ADR-0013). Shared by the cleaning screen's summary and the analysis, so
// the counts a store owner sees before running are the counts the analysis uses.

export type CleaningRules = {
  /** Normalised statuses (see normaliseStatus) whose orders are left out. */
  excludedStatuses: readonly string[];
  /** Defaults to the UTC day after the latest order. */
  analysisDate?: Date;
  lookbackDays?: number;
  amountBasis: 'gross' | 'net';
  subtractRefunds: boolean;
};

export type OrderCounts = {
  used: number;
  status: number;
  withoutDate: number;
  afterAnalysisDate: number;
  beforeWindow: number;
};

export type CleaningCounts = OrderCounts & {
  refundsApplied: number;
  customersWithoutOrders: number;
};

/** Orders that are purchases (not refunds), grouped by status and UTC day (null: no date). */
export type OrderProfile = {
  groups: { status: string; day: number | null; orders: number }[];
  refunds: number;
  /** UTC day number of the latest purchase, if any order has a date. */
  latestDay: number | undefined;
};

export type OrderClass = 'used' | 'status' | 'withoutDate' | 'afterAnalysisDate' | 'beforeWindow';

export const dayMs = 86_400_000;
export const utcDay = (time: number) => Math.floor(time / dayMs);

export const normaliseStatus = (status: string | undefined) =>
  (status ?? '').trim().toLowerCase().replace(/_+/g, ' ').replace(/\s+/g, ' ');

const excludedPattern = /cancel|void|fail|declin|pending|draft|test|trash/;

export function isExcludedByDefault(status: string): boolean {
  const s = normaliseStatus(status);
  return s === 'refunded' || s === 'fully refunded' || excludedPattern.test(s);
}

export function defaultExcludedStatuses(statuses: string[]): string[] {
  return [...new Set(statuses.map(normaliseStatus))].filter(isExcludedByDefault);
}

export function analysisDayFor(rules: CleaningRules, latestDay: number | undefined) {
  if (rules.analysisDate) return utcDay(rules.analysisDate.getTime());
  return latestDay === undefined ? undefined : latestDay + 1;
}

export function classifyOrder(
  status: string,
  day: number | undefined,
  rules: CleaningRules,
  analysisDay: number | undefined,
): OrderClass {
  if (rules.excludedStatuses.includes(status)) return 'status';
  if (day === undefined || analysisDay === undefined) return 'withoutDate';
  if (day > analysisDay) return 'afterAnalysisDate';
  if (rules.lookbackDays !== undefined && day < analysisDay - rules.lookbackDays) {
    return 'beforeWindow';
  }
  return 'used';
}

export function orderCounts(profile: OrderProfile, rules: CleaningRules): OrderCounts {
  const counts: OrderCounts = {
    used: 0,
    status: 0,
    withoutDate: 0,
    afterAnalysisDate: 0,
    beforeWindow: 0,
  };
  const analysisDay = analysisDayFor(rules, profile.latestDay);
  for (const group of profile.groups) {
    counts[classifyOrder(group.status, group.day ?? undefined, rules, analysisDay)] += group.orders;
  }
  return counts;
}
