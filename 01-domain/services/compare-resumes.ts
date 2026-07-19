import { generateAnalysis } from './generate-analysis';
import { rankByAnalysis } from './rank-analyses';
import { PipelineConfig } from '../entities/pipeline-config';
import { Analysis } from '../entities/analysis';

// One job, many resumes -> a ranked list. Built on top of the same public
// generateAnalysis() entry point every other consumer uses (CLI, API) - runs
// it once per candidate against the same jobText/pipelineConfig, then hands
// the results to rankByAnalysis(). No new scoring logic here at all; this is
// orchestration over an already-proven pipeline, not a fourth way to compute
// a score.
export interface ResumeCandidate {
  id: string;
  text: string;
}

export interface RankedCandidate {
  rank: number;
  id: string;
  analysis: Analysis;
}

export function compareResumesToJob(
  candidates: ResumeCandidate[],
  jobText: string,
  pipelineConfig: PipelineConfig
): RankedCandidate[] {
  const entries = candidates.map(candidate => ({
    item: candidate.id,
    // Passes the caller's own candidate id straight through as resumeId -
    // this consumer already has real identity, so there is no reason to let
    // it fall back to the content-hash default (see generate-analysis-v2.ts).
    analysis: generateAnalysis({ resume: candidate.text, job: jobText, pipelineConfig, resumeId: candidate.id }).analysis
  }));

  return rankByAnalysis(entries).map(ranked => ({
    rank: ranked.rank,
    id: ranked.item,
    analysis: ranked.analysis
  }));
}
