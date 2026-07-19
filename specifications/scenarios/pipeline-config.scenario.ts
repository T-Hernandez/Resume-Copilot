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
    'metadata.pipelineConfig.weights.skills': 0.8
  },
  rationale: [
    'The pipeline should carry its own configuration into the analysis metadata.',
    'The configured weights should be visible in the resulting analysis.',
    'The scoring path should be driven by the pipeline config instead of hardcoded constants.',
    'No longer asserts on metadata.pipelineConfig.partialMatchScore: thresholds/partialMatchScore were never real fields on the domain PipelineConfig entity (algorithmVersion + weights only) - V1\'s wrapper only carried them because of an `as any` cast, so this assertion was pinning an implementation accident, not a domain contract. Removed rather than added to PipelineConfig, per the project\'s own "if the domain does not use it, it does not live in the entity" standard.'
  ]
});
