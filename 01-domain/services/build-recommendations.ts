import { RecommendationInput } from './build-recommendation-input';
import { Recommendation } from '../value-objects/recommendation';

// Deterministic, zero-dependency recommendation generator - the "aunque
// sean deterministas al principio" baseline. Turns already-decided facts
// (RecommendationInput - see build-recommendation-input.ts) into direct,
// actionable sentences via fixed rules, no LLM involved.
//
// Lives in 01-domain, not infrastructure: unlike ClaudeRecommendationGenerator
// (which needs the Anthropic SDK and so belongs in infrastructure per
// 01-domain/README.md's "no external deps" rule), this implementation of
// the same RecommendationGenerator concept has zero external dependency -
// it is ordinary domain logic, held to the same evidence-grounded standard
// as buildWeaknesses/buildStrengths: every line traces directly to a gap or
// weakness the domain already computed, nothing invented.
//
// Deliberately NOT the only recommendation path: this is the always-
// available baseline every caller gets for free (no API key required);
// ClaudeRecommendationGenerator remains available as an opt-in richer
// enhancement on top, not a replacement.
export function buildDeterministicRecommendations(input: RecommendationInput): Recommendation[] {
  const recommendations: Array<{ text: string; severity: 'low' | 'medium' | 'high' }> = [];

  for (const gap of input.gaps) {
    recommendations.push({
      text: `Add or gain experience with ${gap} - it's a required skill for this role that your resume doesn't currently show.`,
      severity: 'high'
    });
  }

  // weaknesses already covers skills (as gaps, above) plus experience/
  // education - matched here by the exact phrasing build-weaknesses.ts
  // uses for each category, rather than re-deriving matched state, since
  // that phrasing already encodes which category each line is about.
  for (const weakness of input.weaknesses) {
    if (weakness.startsWith('Experience requirement not met')) {
      recommendations.push({
        text: `${weakness}. Consider highlighting any additional relevant experience, including freelance, contract, or project work.`,
        severity: 'medium'
      });
    }
    if (weakness.startsWith('Education requirement not met')) {
      recommendations.push({
        text: `${weakness}. If you are pursuing further education or an equivalent certification, list it explicitly.`,
        severity: 'medium'
      });
    }
  }

  if (!recommendations.length) {
    recommendations.push({
      text: 'This resume already covers every requirement stated in the job posting - no changes indicated by this analysis.',
      severity: 'low'
    });
  }

  return recommendations.map((recommendation, index) => ({
    id: `deterministic-rec-${index + 1}`,
    ...recommendation
  }));
}
