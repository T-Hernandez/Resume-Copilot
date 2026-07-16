import { MatchResult } from '../entities/match-result';

export function compareSkill(resumeSkill: string, jobSkill: string): MatchResult {
  const exact = resumeSkill.toLowerCase() === jobSkill.toLowerCase();
  return {
    id: `skill-${resumeSkill}-${jobSkill}`,
    type: 'skill',
    resumeRef: resumeSkill,
    jobRef: jobSkill,
    score: exact ? 100 : 70,
    confidence: exact ? 95 : 70,
    reason: exact ? 'Exact skill match' : 'Partial skill match',
    evidence: ['Skills section']
  };
}
