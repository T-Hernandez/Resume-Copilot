import { MatchResult } from './match-result';

export interface Breakdown {
  [category: string]: number; // e.g. skills: 94
}

export interface Analysis {
  id: string;
  resumeId: string;
  jobId: string;
  algorithmVersion: string;
  timestamp: string; // ISO
  overall: number;
  breakdown: Breakdown;
  matches: MatchResult[];
  gaps?: string[];
  strengths?: string[];
  weaknesses?: string[];
  warnings?: string[];
  confidence?: number;
  metadata?: Record<string, unknown>;
}
