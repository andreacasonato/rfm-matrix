// Segment families (DESIGN_BRIEF): colour marks the family, always next to the segment name.

export type Family = { name: string; pill: string };

const thriving: Family = { name: 'Thriving', pill: 'bg-positive-tint text-positive' };
const growing: Family = { name: 'Growing', pill: 'bg-heat-1 text-action-text' };
const slipping: Family = { name: 'Slipping', pill: 'bg-warning-tint text-warning' };
const atRisk: Family = { name: 'At risk', pill: 'bg-negative-tint text-negative' };
const gone: Family = { name: 'Gone', pill: 'bg-canvas text-text-secondary' };

const bySegment: Record<string, Family> = {
  champions: thriving,
  'loyal-customers': thriving,
  'new-customers': growing,
  promising: growing,
  'potential-loyalists': growing,
  'need-attention': slipping,
  'about-to-sleep': slipping,
  'at-risk': atRisk,
  'cant-lose-them': atRisk,
  hibernating: gone,
  lost: gone,
};

/** Segments added by an edited map (S7) fall back to the neutral family. */
export const familyOf = (segmentId: string): Family => bySegment[segmentId] ?? gone;
