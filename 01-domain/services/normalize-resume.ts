import { ParsedResume, NormalizedResume } from '../entities/resume';

export interface ResumeNormalizer {
  normalize(parsed: ParsedResume): NormalizedResume;
}
