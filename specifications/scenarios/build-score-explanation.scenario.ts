import { Scenario } from '../runner/runner';

Scenario({
  name: 'buildScoreExplanation groups matched/missing facts by category (skills, experience, education) instead of flattening them',
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
      '2019 - 2021',
      '',
      'Education',
      'State University',
      "Bachelor's in Computer Science",
      '2015 - 2019'
    ].join('\n'),
    jobText: 'Required Skills: React, Python\nMinExperienceYears: 1\nEducation: Master degree required'
  },
  expect: {
    'scoreExplanation.length': '== 3',
    'scoreExplanation.0.category': 'skills',
    'scoreExplanation.0.matched.length': '== 1',
    'scoreExplanation.0.matched.0': 'React',
    'scoreExplanation.0.missing.length': '== 1',
    'scoreExplanation.0.missing.0': 'Python',
    'scoreExplanation.1.category': 'experience',
    'scoreExplanation.1.matched.length': '== 1',
    'scoreExplanation.1.missing.length': '== 0',
    'scoreExplanation.2.category': 'education',
    'scoreExplanation.2.matched.length': '== 0',
    'scoreExplanation.2.missing.length': '== 1'
  },
  rationale: [
    'This is a pure regrouping of already-computed facts (skillMatches/experienceMatch/educationMatch + breakdown), not new scoring - every number here is already proven correct by score-engine.scenario.ts and the individual matcher scenarios; the point of this spec is proving the per-category grouping itself is correct.',
    'Covers all three categories at once, mirroring build-strengths/build-weaknesses.scenario.ts: a skill that matches and one that does not (skills), a met requirement (experience, 2 real years >= 1 required), and an unmet one (education, bachelor does not satisfy a master requirement) - so both the matched and missing branches of every category get exercised in one scenario.'
  ]
});
