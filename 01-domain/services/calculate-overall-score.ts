import { PipelineConfig } from '../entities/pipeline-config';

// Score Engine, part 2: combines per-category subscores (each produced by
// calculateSubscore) into one overall score, weighted entirely by
// PipelineConfig - no hardcoded weights anywhere in here. A category with
// no configured weight (undefined, 0, or simply missing from the
// breakdown because no Match<T> implementation exists for it yet -
// experience/education/etc. as of this writing) contributes nothing and
// doesn't distort the average, rather than being silently treated as a
// zero or assumed perfect.
export function calculateOverallScore(breakdown: Record<string, number>, pipelineConfig: PipelineConfig): number {
  const weights = pipelineConfig.weights;
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, subscore] of Object.entries(breakdown)) {
    const weight = weights[category];
    if (!weight) continue;
    weightedSum += subscore * weight;
    totalWeight += weight;
  }

  if (!totalWeight) return 0;
  return Math.round(weightedSum / totalWeight);
}
