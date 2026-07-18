import { Scenario } from '../runner/runner';

Scenario({
  name: 'Score Engine averages Match confidence (not just a matched/unmatched ratio) into a subscore',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'React, TypeScript',
      '',
      'Experience',
      'Frontend Developer at Acme Corp',
      '2022-2025',
      'Built dashboards using React, Docker and CI pipelines'
    ].join('\n'),
    jobText: 'Required Skills: React, Docker, GraphQL\nMinExperienceYears: 1',
    pipelineConfig: { algorithmVersion: '1.0.0', weights: { skills: 1 } }
  },
  expect: {
    // React matched at 100 (Skills section), Docker matched at 80
    // (experience-only mention), GraphQL unmatched (0) -> (100+80+0)/3 = 60.
    // A plain matched-count ratio would have said 2/3 = 67, hiding that one
    // of those two matches came from weaker evidence.
    'scoreEngineBreakdown.skills': '== 60',
    'scoreEngineOverall': '== 60'
  },
  rationale: [
    'calculateSubscore consumes Match<T>[] only - it never touches resume/job text directly, which is the whole point of Evidence -> Match -> Score.',
    'Confidence-weighting the subscore (instead of a flat matched/total ratio) makes a weak match pull the score down instead of counting identically to a strong one.'
  ]
});

Scenario({
  name: 'Score Engine: a category with no required items scores 100 (not 0) - no requirements is not a failure',
  given: {
    resumeText: 'Skills\nReact',
    jobText: 'Required Skills: \nMinExperienceYears: 1',
    pipelineConfig: { algorithmVersion: '1.0.0', weights: { skills: 1 } }
  },
  expect: {
    'scoreEngineBreakdown.skills': '== 100',
    'scoreEngineOverall': '== 100'
  },
  rationale: [
    'An empty Match<T>[] means the job asked for nothing in this category - that should read as a perfect subscore, not a zero, or every job posting that omits a category would unfairly tank the overall score.'
  ]
});

Scenario({
  name: 'Score Engine: a weighted category with no Match<T> data yet does not distort the overall score',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'React, TypeScript',
      '',
      'Experience',
      'Frontend Developer at Acme Corp',
      '2022-2025',
      'Built dashboards using React, Docker and CI pipelines'
    ].join('\n'),
    jobText: 'Required Skills: React, Docker, GraphQL\nMinExperienceYears: 1',
    pipelineConfig: { algorithmVersion: '1.0.0', weights: { skills: 0.5, education: 0.5 } }
  },
  expect: {
    // "education" has a configured weight but no ExperienceMatch/EducationMatch
    // exists yet, so calculateOverallScore never sees it in the breakdown at
    // all. The result must equal the skills-only score (60), proving the
    // missing category is skipped rather than silently scored as 0 or 100.
    'scoreEngineOverall': '== 60'
  },
  rationale: [
    'PipelineConfig can list a weight for a category the domain cannot score yet (education/experience Match types don\'t exist as of this writing) - calculateOverallScore must degrade gracefully to "score what we actually have evidence for" instead of crashing or silently punishing/rewarding the candidate for a category nobody measured.'
  ]
});
