import { Analysis } from '../entities/analysis';
import { PipelineConfig } from '../entities/pipeline-config';
import { generateAnalysisV2 } from './generate-analysis-v2';
import { ParsedResumeDocument } from './parse-resume-document';
import { ParsedJobDocument } from './parse-job-document';

export interface GenerateAnalysisInput {
  resume: string;
  job: string;
  pipelineConfig: PipelineConfig;
}

export interface GenerateAnalysisPipeline {
  parsedResumeDocument: ParsedResumeDocument;
  parsedJobDocument: ParsedJobDocument;
  analysis: Analysis;
}

// Public entry point for the domain's GenerateAnalysis verb
// (Ubiquitous-Language.md). As of the migration completed 2026-07-18 (ADR-004),
// this calls generateAnalysisV2 - Parser -> Evidence -> Match<T> -> Score
// Engine is now what ships by default.
//
// generateAnalysisV1 is NOT deleted - it stays @deprecated and directly
// importable (generate-analysis-v1.ts) specifically so
// specifications/reports/compare-v1-v2.ts can keep diffing it against V2 on
// real fixtures, per the user's own migration plan: "mantener V1 un tiempo
// detrás de una bandera o como referencia, mientras el benchmark sigue
// ejecutando ambos." Nothing calls generateAnalysisV1 through this wrapper
// anymore - callers that want V1 specifically must import it directly.
//
// Input is now string-only (previously accepted Resume|string / Job|string):
// confirmed via grep before this change that this wrapper was only ever
// called with raw text (specifications/runner/executor.ts,
// specifications/reports/compare-v1-v2.ts) - the object-input branch was
// unused flexibility for a type (Resume/Job) that is itself transitional
// per ADR-004, so it was not worth preserving.
export function generateAnalysis(input: GenerateAnalysisInput): GenerateAnalysisPipeline {
  const result = generateAnalysisV2({
    resumeText: input.resume,
    jobText: input.job,
    pipelineConfig: input.pipelineConfig
  });

  return {
    parsedResumeDocument: result.parsedResumeDocument,
    parsedJobDocument: result.parsedJobDocument,
    analysis: result.analysis
  };
}
