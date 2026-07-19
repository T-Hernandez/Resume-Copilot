import { Scenario } from '../runner/runner';

Scenario({
  name: 'buildRecommendationInput packages Analysis facts into the exact shape a future RecommendationGenerator may read',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'React',
      '',
      'Experience',
      'Company A',
      'Software Engineer',
      '2019 - 2021'
    ].join('\n'),
    jobText: 'Required Skills: React, Python\nMinExperienceYears: 1'
  },
  expect: {
    'recommendationInput.overall': 'greaterThan:0',
    'recommendationInput.strengths.length': '== 2',
    'recommendationInput.weaknesses.length': '== 1',
    'recommendationInput.weaknesses.0': 'Missing required skill: Python',
    'recommendationInput.gaps.length': '== 1',
    'recommendationInput.gaps.0': 'Python'
  },
  rationale: [
    'This is a pure extraction, not new computation - every field here already exists on Analysis; the point is proving the packaging is correct and complete, since this is exactly what a RecommendationGenerator implementation (infrastructure layer, not built yet) will receive as its only input.',
    'No LLM call happens here or anywhere in this spec - RecommendationGenerator (recommendation-generator.ts) is a port only, per 01-domain/README.md (\"Implementaciones pertenecen a la capa de infrastructure\"). Building an actual adapter requires a new layer outside 01-domain, an LLM SDK dependency, and API credentials - none of which exist in this repo yet.'
  ]
});
