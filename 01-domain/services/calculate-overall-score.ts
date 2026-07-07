import { MatchResult } from '../entities/match-result';
import { PipelineConfig } from '../entities/pipeline-config';

export interface OverallScoreCalculator {
  calculate(breakdown: Record<string, number>, pipelineConfig: PipelineConfig): number;
}
