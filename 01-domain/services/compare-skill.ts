import { SkillInstance } from '../entities/skill';
import { MatchResult } from '../entities/match-result';

export interface SkillComparer {
  compare(resumeSkill: SkillInstance, jobSkill: string): MatchResult;
}
