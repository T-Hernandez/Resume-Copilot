import { Match } from '../value-objects/match';
import { ParsedResumeDocument } from '../services/parse-resume-document';
import { buildExperienceEvidence } from './build-experience-evidence';
import { matchConfidence } from './match-confidence';
import { totalExperienceYears } from './experience-duration';

export interface ExperienceRequirement {
  minYears: number;
}

export type ExperienceMatch = Match<ExperienceRequirement>;

// Matching Engine: same shape as matchSkill - build evidence, then decide.
// `matched` compares total years against the requirement; `confidence`
// comes from matchConfidence(evidence) unconditionally (same as skills),
// so a confident "no, they don't have enough experience" (good evidence,
// requirement simply not met) reads differently from "we can't tell"
// (little or no usable evidence) - matched and confidence answer two
// different questions and shouldn't be collapsed into one.
export function matchExperience(requirement: ExperienceRequirement, resume: ParsedResumeDocument): ExperienceMatch {
  const evidence = buildExperienceEvidence(resume);
  const years = totalExperienceYears(resume.experience);

  return {
    query: requirement,
    matched: years >= requirement.minYears,
    confidence: matchConfidence(evidence),
    evidence
  };
}
