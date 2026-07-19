import { PipelineConfig } from '../01-domain/entities/pipeline-config';

// The one PipelineConfig every consumer (cli/analyze.ts, api/analyze-handler.ts)
// uses unless it builds its own - was previously defined identically in both
// places, which meant changing a weight required remembering to update it
// twice. Not domain logic itself (01-domain never hardcodes a default; it
// only defines the PipelineConfig shape) - this is an application-level
// choice, same boundary the spec harness's own scoreEnginePipelineConfig
// default occupies for tests.
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  algorithmVersion: '2.0.0',
  weights: { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15 }
};
