import { Analysis } from '../entities/analysis';

// The structured "context" step the user asked for between deterministic
// facts and the LLM: NOT recommendations, NOT prose - just the exact facts
// GenerateRecommendations is allowed to read from, packaged into one shape.
// Deliberately a pure extraction (no computation, no new facts) - overall/
// breakdown/confidence/strengths/weaknesses/gaps all already exist on
// Analysis; this only decides which of them a recommendation generator gets
// to see, per ADR-001 ("el dominio produce hechos; el LLM solo los explica").
export interface RecommendationInput {
  overall: number;
  confidence?: number;
  breakdown: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
}

export function buildRecommendationInput(analysis: Analysis): RecommendationInput {
  return {
    overall: analysis.overall,
    confidence: analysis.confidence,
    breakdown: analysis.breakdown,
    strengths: analysis.strengths ?? [],
    weaknesses: analysis.weaknesses ?? [],
    gaps: analysis.gaps ?? []
  };
}
