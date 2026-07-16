import { MatchResult } from '../entities/match-result';
import { compareExperience } from './compare-experience';
import { compareSkill } from './compare-skill';

export function matchResumeToJob(resumeSkills: string[], jobSkills: string[], resumeYears: number, minExperienceYears: number): MatchResult[] {
  const results: MatchResult[] = [];
  const seenJobSkills = new Set<string>();

  for (const skill of resumeSkills) {
    const match = jobSkills.find(jobSkill => skill.toLowerCase() === jobSkill.toLowerCase());
    if (match && !seenJobSkills.has(match.toLowerCase())) {
      seenJobSkills.add(match.toLowerCase());
      results.push(compareSkill(skill, match));
    }
  }

  results.push(compareExperience(resumeYears, minExperienceYears));

  return results;
}
