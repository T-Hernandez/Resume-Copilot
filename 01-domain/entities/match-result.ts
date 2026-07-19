/**
 * @deprecated Superseded by Match<T> (value-objects/match.ts) per ADR-004.
 * MatchResult embeds `score` directly on the match, coupling "did this
 * match" with "how many points" - the design ADR-004 replaced after that
 * coupling was traced to 4 real scoring defects in generateAnalysisV1 (see
 * specifications/reports/compare-v1-v2.ts). Kept only because V1 is still
 * live; do not use in new code.
 */
export type MatchType =
  | 'skill'
  | 'experience'
  | 'education'
  | 'keyword'
  | 'certification'
  | 'language';

export interface MatchResult {
  id: string;
  type: MatchType;
  resumeRef?: string | null; // reference id to Resume element
  jobRef: string; // reference id to Job element
  score: number; // 0..100
  confidence: number; // 0..100
  reason?: string;
  evidence?: string[]; // human-readable references (e.g. 'Experience #2', 'Skills section')
}
