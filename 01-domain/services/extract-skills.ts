import { NormalizedResume } from '../entities/resume';
import { SkillInstance } from '../entities/skill';

export interface SkillExtractor {
  extract(resume: NormalizedResume): SkillInstance[];
}
