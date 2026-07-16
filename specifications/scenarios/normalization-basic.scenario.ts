import { Scenario } from '../runner/runner';

Scenario({
  name: 'Skill normalization canonicalizes aliases',
  given: {
    resumeText: 'Skills: ReactJS, Node.js, PostgreSQL',
    jobText: 'Required Skills: React, Node.js, PostgreSQL'
  },
  expect: {
    overall: '>= 95',
    'breakdown.skills': '>= 95',
    'gaps.length': '== 0',
    confidence: '>= 70'
  },
  rationale: [
    'Resume exposes ReactJS, Node.js and PostgreSQL.',
    'Job requires React, Node.js and PostgreSQL.',
    'The normalizer must collapse aliases to the same canonical form.',
    'Matching should therefore succeed without artificial score inflation.'
  ]
});
