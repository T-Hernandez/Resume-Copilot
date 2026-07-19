import { Scenario } from '../runner/runner';

Scenario({
  name: 'buildDeterministicRecommendations turns gaps and weaknesses into actionable text, with no LLM involved',
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
      '2020 - 2021'
    ].join('\n'),
    jobText: 'Required Skills: React, Python\nMinExperienceYears: 5'
  },
  expect: {
    'deterministicRecommendations.length': '== 2',
    'deterministicRecommendations.0.severity': 'high',
    'deterministicRecommendations.0.text': 'contains:Python',
    'deterministicRecommendations.1.severity': 'medium',
    'deterministicRecommendations.1.text': 'contains:Experience requirement not met'
  },
  rationale: [
    'One recommendation per gap (missing skill, severity high) plus one per unmet experience/education requirement (severity medium) - directly mirrors buildWeaknesses/buildRecommendationInput\'s own facts, nothing invented beyond fixed phrasing.',
    'No network call, no API key, no RecommendationGenerator port involved - this is the always-available baseline (see build-recommendations.ts), distinct from ClaudeRecommendationGenerator which stays an opt-in enhancement in infrastructure/.'
  ]
});

Scenario({
  name: 'buildDeterministicRecommendations returns an encouraging note, not an empty list, when every requirement is already met',
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
      '2018 - 2023'
    ].join('\n'),
    jobText: 'Required Skills: React\nMinExperienceYears: 1'
  },
  expect: {
    'deterministicRecommendations.length': '== 1',
    'deterministicRecommendations.0.severity': 'low',
    'deterministicRecommendations.0.text': 'contains:already covers'
  },
  rationale: [
    'A resume with zero gaps and zero weaknesses must not silently return an empty recommendations array - a caller (CLI/API) rendering "Recommendations: (none)" reads as broken, not as "great job."'
  ]
});
