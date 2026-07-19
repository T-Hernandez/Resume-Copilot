import { Scenario } from '../runner/runner';

Scenario({
  name: 'GenerateAnalysis produces a valid analysis end to end',
  given: {
    resumeText: 'Skills: React, TypeScript, HTML, CSS\nExperience:\n- Frontend Developer (2021-2024)',
    jobText: 'Required Skills: React; TypeScript; HTML; CSS\nMinExperienceYears: 2',
    pipelineConfig: {
      algorithmVersion: '0.1.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    overall: '>= 80',
    'breakdown.skills': '>= 80',
    'skillMatches.length': '>= 1',
    'gaps.length': '>= 0',
    confidence: '>= 70'
  },
  rationale: [
    'The scenario uses a resume and a job as input.',
    'The engine must parse, normalize, match, score, and return an Analysis artifact.',
    'This is the first end-to-end domain slice the benchmark should protect.',
    'Asserts on skillMatches instead of the legacy matches (MatchResult[]) field - matches is deliberately left empty in the Match<T>-based pipeline (see generate-analysis-v2.ts), since populating it would mean synthesizing a per-item score that does not exist upstream.'
  ]
});
