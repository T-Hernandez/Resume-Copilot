import { SkillMatch } from '../matching/match-skill';
import { ExperienceMatch } from '../matching/match-experience';
import { EducationMatch } from '../matching/match-education';

// First deterministic piece of Fase 2 (Analisis inteligente). Weaknesses is
// a canonical Ubiquitous Language noun that neither generateAnalysisV1 nor
// generateAnalysisV2 ever populated - this fills it, and nothing more.
//
// Per ADR-001, this is still the backend deciding WHAT the weaknesses are:
// every line here is derived only from a Match<T>'s own matched/query
// fields, nothing invented or inferred. Turning these into warmer natural
// language, or synthesizing recommendations from them, is explicitly the
// next, separate, LLM/presentation-layer step (GenerateRecommendations in
// Ubiquitous-Language.md is already scoped as "externo a dominio", not
// this function's job) - this function only ever produces facts a resume
// reader could verify directly against the job posting and the Match<T>
// data, the same standard Evidence Builders are held to.
export function buildWeaknesses(input: {
  skillMatches: SkillMatch[];
  experienceMatch?: ExperienceMatch;
  educationMatch?: EducationMatch;
}): string[] {
  const weaknesses: string[] = [];

  for (const match of input.skillMatches) {
    if (!match.matched) {
      weaknesses.push(`Missing required skill: ${match.query}`);
    }
  }

  if (input.experienceMatch && !input.experienceMatch.matched) {
    weaknesses.push(`Experience requirement not met: job requires ${input.experienceMatch.query.minYears}+ years`);
  }

  if (input.educationMatch && !input.educationMatch.matched) {
    weaknesses.push(`Education requirement not met: job requires at least a ${input.educationMatch.query.minLevel} degree`);
  }

  return weaknesses;
}
