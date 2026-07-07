import { NormalizedResume } from '../entities/resume';
import { Job } from '../entities/job';
import { Analysis } from '../entities/analysis';
import { PipelineConfig } from '../entities/pipeline-config';

export interface AnalysisGenerator {
  generate(resume: NormalizedResume, job: Job, pipelineConfig: PipelineConfig): Promise<Analysis> | Analysis;
}
