import { Match } from '../value-objects/match';
import { Evidence } from '../value-objects/evidence';
import { ParsedResumeDocument } from '../services/parse-resume-document';
import { buildSkillEvidence } from './build-skill-evidence';
import { matchConfidence } from './match-confidence';

export type SkillMatch = Match<string>;

// Matching Engine: takes evidence and decides whether the query is
// satisfied. No score, no percentage - just matched/confidence/evidence.
// The Score Engine (not built yet) is what turns a batch of these into a
// number, so today's scoring formula can change later without this
// function moving at all.
export function matchSkill(jobSkill: string, resume: ParsedResumeDocument): SkillMatch {
  const evidence: Evidence[] = buildSkillEvidence(jobSkill, resume);

  return {
    query: jobSkill,
    matched: evidence.length > 0,
    confidence: matchConfidence(evidence),
    evidence
  };
}

export function matchSkills(jobSkills: string[], resume: ParsedResumeDocument): SkillMatch[] {
  return jobSkills.map(jobSkill => matchSkill(jobSkill, resume));
}
