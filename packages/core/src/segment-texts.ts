// Plain-words definition and suggested action for each default segment (ADR-0014). Written for
// this project as a paraphrase of common RFM guidance; nothing is copied.

export const segmentTexts: Record<string, { description: string; suggestedAction: string }> = {
  champions: {
    description: 'Bought recently and buy often.',
    suggestedAction: 'Reward them without discounts: early access, thank-you notes.',
  },
  'loyal-customers': {
    description: 'Buy regularly, and fairly recently.',
    suggestedAction: 'Recommend related products; invite them to a loyalty or referral scheme.',
  },
  'potential-loyalists': {
    description: 'Recent customers with a few orders so far.',
    suggestedAction: 'A welcome series and a reason to come back soon.',
  },
  'new-customers': {
    description: 'Placed their first order very recently.',
    suggestedAction: 'Help them get on with what they bought; ask gently for a second order.',
  },
  promising: {
    description: 'Recent customers with one order.',
    suggestedAction: 'Show them more of the range; a small first-repeat incentive.',
  },
  'need-attention': {
    description: 'Middling recency and frequency.',
    suggestedAction: 'A timely reminder or a personal recommendation before they drift.',
  },
  'about-to-sleep': {
    description: 'Not recent, and only a few orders.',
    suggestedAction: 'Re-engage with popular products or a limited-time reason to return.',
  },
  'at-risk': {
    description: 'Used to buy several times, but not lately.',
    suggestedAction: 'A personal win-back: ask what changed and offer help.',
  },
  'cant-lose-them': {
    description: 'Bought most often, but a long time ago.',
    suggestedAction: 'Your most valuable lapsed customers: reach out personally.',
  },
  hibernating: {
    description: 'Last bought long ago, with two orders.',
    suggestedAction: "Low-cost reminders only; don't overspend.",
  },
  lost: {
    description: 'Bought once, a long time ago.',
    suggestedAction: 'Stop paying to reach them; include them only in cheap broad campaigns.',
  },
};
