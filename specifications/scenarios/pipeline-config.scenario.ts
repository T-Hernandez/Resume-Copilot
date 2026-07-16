import { Scenario } from '../runner/runner';

Scenario({
  name: 'Pipeline config drives scoring and metadata',
  given: {
    resumeText: 'Skills: React, Node.js',
    jobText: 'Required Skills: React, Node.js',
    pipelineConfig: {
      algorithmVersion: '1.0.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    overall: '>= 80',
    'metadata.algorithmVersion': '1.0.0',
    'metadata.pipelineConfig.weights.skills': 0.8,
    'metadata.pipelineConfig.partialMatchScore': 70
  },
  rationale: [
    'The pipeline should carry its own configuration into the analysis metadata.',
    'The configured weights should be visible in the resulting analysis.',
    'The scoring path should be driven by the pipeline config instead of hardcoded constants.'
  ]
});
