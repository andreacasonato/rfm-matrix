import { describe, expect, it } from 'vitest';
import { defaultSegmentMap } from './segments';

describe('default segment texts (ADR-0014)', () => {
  it('gives every segment a short definition and suggested action', () => {
    for (const segment of defaultSegmentMap.segments) {
      expect(segment.description.length, segment.id).toBeGreaterThan(10);
      expect(segment.suggestedAction.length, segment.id).toBeGreaterThan(10);
      expect(segment.description.length + segment.suggestedAction.length).toBeLessThan(200);
    }
  });

  it('uses the approved wording', () => {
    const champions = defaultSegmentMap.segments.find((s) => s.id === 'champions');
    expect(champions).toMatchObject({
      description: 'Bought recently and buy often.',
      suggestedAction: 'Reward them without discounts: early access, thank-you notes.',
    });
  });
});
