import { Evidence } from '../value-objects/evidence';

// Generic across every Match<T> type (SkillMatch today, ExperienceMatch /
// EducationMatch / etc. later) - confidence is a property of "a pile of
// Evidence", not of skills specifically, so this doesn't live next to
// match-skill.ts.
//
// Encapsulated on purpose, and deliberately simplistic for now: it's just
// the strongest single piece of evidence. That means ten mentions and one
// mention of equal quality score identically right now - confidence
// currently answers "how good is the best evidence" rather than "how
// confident should we be overall" (which would also weigh quantity and
// source diversity). A richer formula belongs here, later, without any
// caller needing to change.
export function matchConfidence(evidence: Evidence[]): number {
  if (!evidence.length) return 0;
  return Math.max(...evidence.map(item => item.confidence));
}
