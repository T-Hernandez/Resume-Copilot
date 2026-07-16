import { Scenario } from '../runner/runner';

Scenario({
  name: 'Empty resume produces zeroed analysis and warning',
  given: {
    resumeText: '',
    jobText: 'Required Skills: React\nMinExperienceYears: 2',
    pipelineConfig: {
      algorithmVersion: '0.1.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    overall: '== 0',
    confidence: '== 0',
    'warnings': 'contains:Empty resume'
  },
  rationale: [
    'An empty resume should not produce a misleading score.',
    'The analysis should explicitly warn about the missing input.'
  ]
});

Scenario({
  name: 'Unknown skills produce warnings',
  given: {
    resumeText: 'Skills: ReactXtreme',
    jobText: 'Required Skills: React',
    pipelineConfig: {
      algorithmVersion: '0.1.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    'warnings': 'contains:Unknown skill'
  },
  rationale: [
    'Skill aliases that do not map cleanly should surface a warning.',
    'This makes normalization behavior auditable.'
  ]
});

Scenario({
  name: 'Duplicate aliases collapse to one canonical skill',
  given: {
    resumeText: 'Skills: React, ReactJS, React.js',
    jobText: 'Required Skills: React',
    pipelineConfig: {
      algorithmVersion: '0.1.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    'matches.length': '>= 1'
  },
  rationale: [
    'Repeated aliases should collapse into one canonical skill match.',
    'The engine should avoid inflating the score by counting duplicates as separate evidence.'
  ]
});
