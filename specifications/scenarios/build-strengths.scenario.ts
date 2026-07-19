import { Scenario } from '../runner/runner';

Scenario({
  name: 'generateAnalysisV2 populates strengths across skills, experience, and education, mirroring buildWeaknesses',
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
      'BSc Computer Science',
      '2016 - 2020'
    ].join('\n'),
    jobText: "Required Skills: React\nMinExperienceYears: 1\nEducation: Bachelor's degree required"
  },
  expect: {
    'analysisV2.strengths.length': '== 3',
    'analysisV2.strengths.0': 'Has required skill: React',
    'analysisV2.strengths.1': 'Meets experience requirement: 1+ years required',
    'analysisV2.strengths.2': 'Meets education requirement: at least a bachelor degree required'
  },
  rationale: [
    'buildStrengths is buildWeaknesses inverted (matched=true instead of false) - same rule, same evidence-grounded standard: every line traces to a Match<T>\'s own matched/query fields, nothing phrased or inferred beyond that.',
    'Covers all three Match<T> categories, same as the weaknesses scenario, so strengths stops being skills-only the moment a job also states experience/education requirements the candidate meets.'
  ]
});
