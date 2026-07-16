import { Scenario } from '../runner/runner';

Scenario({
  name: 'Frontend Junior matches React Job',
  given: { resumePath: 'fixtures/resume/frontend-junior.txt', jobPath: 'fixtures/job/react-junior.txt' },
  expect: {
    overall: '>= 90',
    'breakdown.skills': '>= 90',
    'gaps.length': '== 0',
    confidence: '>= 50'
  },
  rationale: [
    'The resume has React-focused experience and projects.',
    'The job requires React and related frontend skills.',
    'The match should be strong because required skills overlap and experience is compatible.'
  ]
});
