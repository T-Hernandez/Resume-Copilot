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
