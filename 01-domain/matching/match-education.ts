import { Match } from '../value-objects/match';
import { ParsedResumeDocument } from '../services/parse-resume-document';
import { buildEducationEvidence } from './build-education-evidence';
import { matchConfidence } from './match-confidence';
import { DegreeLevel, degreeLevelRank, highestDegreeLevel } from './degree-level';

export interface EducationRequirement {
  minLevel: DegreeLevel;
}

export type EducationMatch = Match<EducationRequirement>;

// Matching Engine: same shape as matchSkill/matchExperience - build
// evidence, then decide. `matched` compares the candidate's highest
// recognized degree level against the requirement; `confidence` comes from
// matchConfidence(evidence) unconditionally, so a resume with one clearly
// -stated degree that simply doesn't meet the bar reads as a confident
// "no", not "we don't know".
export function matchEducation(requirement: EducationRequirement, resume: ParsedResumeDocument): EducationMatch {
  const evidence = buildEducationEvidence(resume);
  const highest = highestDegreeLevel(resume.education);
  const matched = highest !== undefined && degreeLevelRank(highest) >= degreeLevelRank(requirement.minLevel);

  return {
    query: requirement,
    matched,
    confidence: matchConfidence(evidence),
    evidence
  };
}
