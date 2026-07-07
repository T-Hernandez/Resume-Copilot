import { NormalizedResume } from '../entities/resume';
import { Job } from '../entities/job';
import { MatchResult } from '../entities/match-result';

export interface MatcherService {
  match(resume: NormalizedResume, job: Job): MatchResult[];
}
