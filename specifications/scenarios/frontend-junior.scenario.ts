import { Scenario } from '../runner/runner';

Scenario({
  name: 'Frontend Junior matches React Job',
  given: { resumePath: '../../examples/resume-frontend-junior.txt', jobPath: '../../examples/job-react.txt' },
  expect: {
    'overall': '>= 90',
    'breakdown.skills': '>= 90',
    'gaps.length': '== 0', // ensure no missing skills
    'confidence': '>= 50'
  }
});
