import { SkillMatch } from '../matching/match-skill';
import { ExperienceMatch } from '../matching/match-experience';
import { EducationMatch } from '../matching/match-education';

// Mirror of buildWeaknesses.ts, same rule set inverted: matched=true instead
// of matched=false. Same ADR-001 boundary applies - plain facts derived only
// from Match<T>'s own matched/query fields, no phrasing/prose decisions made
// here (that is GenerateRecommendations' job, explicitly outside the domain
// per Ubiquitous-Language.md).
export function buildStrengths(input: {
  skillMatches: SkillMatch[];
  experienceMatch?: ExperienceMatch;
  educationMatch?: EducationMatch;
}): string[] {
  const strengths: string[] = [];

  for (const match of input.skillMatches) {
    if (match.matched) {
      strengths.push(`Has required skill: ${match.query}`);
    }
  }

  if (input.experienceMatch && input.experienceMatch.matched) {
    strengths.push(`Meets experience requirement: ${input.experienceMatch.query.minYears}+ years required`);
  }

  if (input.educationMatch && input.educationMatch.matched) {
    strengths.push(`Meets education requirement: at least a ${input.educationMatch.query.minLevel} degree required`);
  }

  return strengths;
}
