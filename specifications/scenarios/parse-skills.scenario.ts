import { Scenario } from '../runner/runner';

Scenario({
  name: 'Skills parser resolves category-grouped skills to structured, normalized instances',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'Frontend:',
      'React',
      'Next.js',
      '',
      'Backend:',
      'Node',
      'Express'
    ].join('\n'),
    jobText: 'Required Skills: React\nMinExperienceYears: 1'
  },
  expect: {
    'parsedResumeDocument.skills.length': '== 4',
    'parsedResumeDocument.skills.0.raw': 'React',
    'parsedResumeDocument.skills.0.canonical': 'react',
    'parsedResumeDocument.skills.0.category': 'frontend',
    'parsedResumeDocument.skills.0.confidence': '>= 90',
    'parsedResumeDocument.skills.2.raw': 'Node',
    'parsedResumeDocument.skills.2.canonical': 'node.js',
    'parsedResumeDocument.skills.2.category': 'backend'
  },
  rationale: [
    'A resume that groups skills under sub-headers ("Frontend:", "Backend:") is common - the parser must tag each skill with its category, not just flatten everything.',
    'Canonicalization is delegated to the existing DefaultSkillNormalizer instead of being reimplemented here - "Node" and "React" resolve through the same alias table matching already uses elsewhere.'
  ]
});

Scenario({
  name: 'Skills parser handles comma lists and bullets, and de-duplicates repeats',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'React, TypeScript, Node.js',
      '- React'
    ].join('\n'),
    jobText: 'Required Skills: React\nMinExperienceYears: 1'
  },
  expect: {
    'parsedResumeDocument.skills.length': '== 3',
    'parsedResumeDocument.skills.1.raw': 'TypeScript',
    'parsedResumeDocument.skills.1.canonical': 'typescript'
  },
  rationale: [
    'A flat comma-separated line and a bulleted line are both common in real resumes and must resolve to the same shape.',
    'The same skill mentioned twice (once in the comma list, once bulleted below) must collapse to one entry, not be counted twice.'
  ]
});

Scenario({
  name: 'Skills parser works on the real "Skills: a, b, c" inline fixture convention',
  given: {
    resumePath: 'examples/resume-frontend-junior.txt',
    jobPath: 'examples/job-react.txt'
  },
  expect: {
    'parsedResumeDocument.skills.length': '>= 5',
    'parsedResumeDocument.skills.0.canonical': 'react'
  },
  rationale: [
    'The parser must work on the real example fixture, not just purpose-built test text, same expectation as the experience/education parsers.'
  ]
});
