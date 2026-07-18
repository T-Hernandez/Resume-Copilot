import { Evidence } from './evidence';

// Generic shape for "did the resume satisfy this query, and why". Deliberately
// carries no score/points - that's the Score Engine's job, downstream, once
// it has a batch of these to weigh. A Match only ever answers yes/no (with
// evidence), never "how many points".
//
// No `reasons` field on purpose: `evidence[].source` already says why a
// match happened ("resume.skills", "resume.experience", ...). A separate
// reasons list would just be evidence.source restated - one fact, two
// places to keep in sync. Anything that wants "why" (Score Engine, LLM
// report) derives it from `evidence` directly.
export interface Match<T> {
  query: T;
  matched: boolean;
  confidence: number; // 0..100 - see matchConfidence() in matching/match-confidence.ts
  evidence: Evidence[];
}
