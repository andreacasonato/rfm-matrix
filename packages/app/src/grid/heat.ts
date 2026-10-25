// Heatmap tint (DESIGN_BRIEF): five steps relative to the busiest cell, none for an empty one.

export type HeatStep = 0 | 1 | 2 | 3 | 4 | 5;

export function heatStep(customers: number, largest: number): HeatStep {
  if (customers <= 0 || largest <= 0) return 0;
  return Math.min(5, Math.max(1, Math.ceil((customers / largest) * 5))) as HeatStep;
}

// Literal class names so Tailwind generates them. Step 5 keeps dark text in both themes; the
// other steps use the primary text colour, which is dark in light mode and light in dark mode.
export const heatClasses: Record<HeatStep, string> = {
  0: 'bg-surface text-text-secondary',
  1: 'bg-heat-1 text-text-primary',
  2: 'bg-heat-2 text-text-primary',
  3: 'bg-heat-3 text-text-primary',
  4: 'bg-heat-4 text-text-primary',
  5: 'bg-heat-5 text-on-action',
};
