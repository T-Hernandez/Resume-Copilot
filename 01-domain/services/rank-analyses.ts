import { Analysis } from '../entities/analysis';

// Pure, deterministic sort - no LLM, no external input beyond the Analyses
// already computed by generateAnalysis(). Per ADR-001 ("el dominio produce
// hechos; el LLM solo los explica"), ranking candidates is itself a fact
// derivable from already-decided scores, not a judgment call that needs an
// LLM.
//
// Generic over T (the caller's own identifier - a filename, a resume id,
// whatever) rather than assuming Analysis.resumeId is meaningful: every
// Analysis produced by generateAnalysisV2 currently carries the same
// hardcoded resumeId ('resume-1') regardless of input, so identity has to
// travel alongside the Analysis, not inside it. That's a known placeholder
// in generate-analysis-v2.ts, not something this function should work
// around by reaching into or changing tested domain code.
export interface RankedItem<T> {
  rank: number;
  item: T;
  analysis: Analysis;
}

// Primary sort: overall score, descending. Tiebreak: confidence, descending,
// with `undefined` (nothing was evaluated - see generate-analysis-v2.ts)
// sorted last rather than treated as 0 or as a tie - an untested confidence
// is worse information than a low-but-real one, not a numeric zero.
export function rankByAnalysis<T>(entries: Array<{ item: T; analysis: Analysis }>): Array<RankedItem<T>> {
  const sorted = [...entries].sort((a, b) => {
    if (b.analysis.overall !== a.analysis.overall) {
      return b.analysis.overall - a.analysis.overall;
    }
    const aHasConfidence = typeof a.analysis.confidence === 'number';
    const bHasConfidence = typeof b.analysis.confidence === 'number';
    if (aHasConfidence !== bHasConfidence) {
      return aHasConfidence ? -1 : 1;
    }
    if (aHasConfidence && bHasConfidence) {
      return (b.analysis.confidence as number) - (a.analysis.confidence as number);
    }
    return 0;
  });

  return sorted.map((entry, index) => ({ rank: index + 1, item: entry.item, analysis: entry.analysis }));
}
