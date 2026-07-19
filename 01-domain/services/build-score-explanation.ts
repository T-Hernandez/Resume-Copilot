import { SkillMatch } from '../matching/match-skill';
import { ExperienceMatch } from '../matching/match-experience';
import { EducationMatch } from '../matching/match-education';

// Same evidence-grounded standard as buildStrengths/buildWeaknesses (per
// ADR-001: only facts a reader could verify directly against the job
// posting and the Match<T> data, nothing phrased or inferred). This groups
// those same facts by category instead of flattening them, specifically so
// a consumer (CLI, API, eventually a frontend) can render a per-category
// breakdown - a bar chart, a progress ring, whatever - without re-deriving
// which skill belongs to which category itself.
//
// Deliberately NOT a field on Analysis: Analysis already carries breakdown/
// strengths/weaknesses/gaps as flat facts, and per the user's own review,
// Analysis's job is "the analysis," not carrying more structure than that.
// This lives alongside skillMatches/experienceMatch/educationMatch on the
// GenerateAnalysisV2Pipeline return instead - additive, opt-in for whatever
// consumer wants to render it.
export interface CategoryExplanation {
  category: string;
  score: number;
  matched: string[];
  missing: string[];
}

export function buildScoreExplanation(input: {
  breakdown: Record<string, number>;
  skillMatches: SkillMatch[];
  experienceMatch?: ExperienceMatch;
  educationMatch?: EducationMatch;
}): CategoryExplanation[] {
  const explanation: CategoryExplanation[] = [];

  if ('skills' in input.breakdown) {
    explanation.push({
      category: 'skills',
      score: input.breakdown.skills,
      matched: input.skillMatches.filter(match => match.matched).map(match => match.query),
      missing: input.skillMatches.filter(match => !match.matched).map(match => match.query)
    });
  }

  if (input.experienceMatch && 'experience' in input.breakdown) {
    const label = `${input.experienceMatch.query.minYears}+ years required`;
    explanation.push({
      category: 'experience',
      score: input.breakdown.experience,
      matched: input.experienceMatch.matched ? [label] : [],
      missing: input.experienceMatch.matched ? [] : [label]
    });
  }

  if (input.educationMatch && 'education' in input.breakdown) {
    const label = `at least a ${input.educationMatch.query.minLevel} degree required`;
    explanation.push({
      category: 'education',
      score: input.breakdown.education,
      matched: input.educationMatch.matched ? [label] : [],
      missing: input.educationMatch.matched ? [] : [label]
    });
  }

  return explanation;
}
