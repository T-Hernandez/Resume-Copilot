import { Evidence } from './evidence';

// Generic shape for "did the resume satisfy this query, and why". Deliberately
// carries no score/points - that's the Score Engine's job, downstream, once
// it has a batch of these to weigh. A Match only ever answers yes/no (with
// evidence), never "how many points".
export interface Match<T> {
  query: T;
  matched: boolean;
  confidence: number; // 0..100 - how sure the match itself is, derived from evidence
  evidence: Evidence[];
  reasons: string[]; // e.g. "canonical-skill", "mentioned-in-experience" - machine-readable tags, not prose
}
