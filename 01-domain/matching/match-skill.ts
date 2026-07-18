import { Match } from '../value-objects/match';
import { Evidence, EvidenceSource } from '../value-objects/evidence';
import { ParsedResumeDocument } from '../services/parse-resume-document';
import { buildSkillEvidence } from './build-skill-evidence';

export type SkillMatch = Match<string>;

const REASON_BY_SOURCE: Record<EvidenceSource, string> = {
  'resume.skills': 'canonical-skill',
  'resume.experience': 'mentioned-in-experience',
  'resume.projects': 'mentioned-in-projects',
  'resume.summary': 'mentioned-in-summary'
};

// Matching Engine: takes evidence and decides whether the query is
// satisfied. No score, no percentage - just matched/confidence/reasons.
// The Score Engine (not built yet) is what turns a batch of these into a
// number, so today's scoring formula can change later without this
// function moving at all.
export function matchSkill(jobSkill: string, resume: ParsedResumeDocument): SkillMatch {
  const evidence: Evidence[] = buildSkillEvidence(jobSkill, resume);
  const matched = evidence.length > 0;

  const reasons = [...new Set(evidence.map(item => REASON_BY_SOURCE[item.source]))];
  const confidence = matched ? Math.max(...evidence.map(item => item.confidence)) : 0;

  return { query: jobSkill, matched, confidence, evidence, reasons };
}

export function matchSkills(jobSkills: string[], resume: ParsedResumeDocument): SkillMatch[] {
  return jobSkills.map(jobSkill => matchSkill(jobSkill, resume));
}
