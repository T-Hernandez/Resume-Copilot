import { MatchResult } from '../entities/match-result';

export function compareExperience(resumeYears: number, minExperienceYears: number): MatchResult {
  const score = Math.min(100, Math.round((resumeYears / Math.max(1, minExperienceYears)) * 100));
  return {
    id: `experience-${resumeYears}-${minExperienceYears}`,
    type: 'experience',
    resumeRef: `years:${resumeYears}`,
    jobRef: `minYears:${minExperienceYears}`,
    score,
    confidence: 80,
    reason: resumeYears >= minExperienceYears ? 'Experience meets minimum requirement' : 'Experience is below minimum requirement',
    evidence: ['Experience section']
  };
}
