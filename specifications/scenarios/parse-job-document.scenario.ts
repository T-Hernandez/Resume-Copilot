import { Scenario } from '../runner/runner';

Scenario({
  name: 'Job document parser resolves labeled fields from the real job fixture',
  given: {
    resumeText: 'Skills: React',
    jobPath: 'examples/job-react.txt'
  },
  expect: {
    'parsedJobDocument.title': 'Frontend React Developer',
    'parsedJobDocument.requiredSkills.length': '== 4',
    'parsedJobDocument.requiredSkills.0': 'React',
    'parsedJobDocument.preferredSkills.length': '== 2',
    'parsedJobDocument.minExperienceYears': '== 2',
    'parsedJobDocument.keywords.length': '== 3',
    'parsedJobDocument.description': 'contains:React'
  },
  rationale: [
    'The parser must work on the real job fixtures already in the repo, same expectation as every resume-side parser.',
    'requiredSkills/preferredSkills/keywords all use ";" as a separator in this fixture and must split correctly.'
  ]
});

Scenario({
  name: 'Job document parser handles multi-line responsibilities/benefits blocks and a leading description paragraph',
  given: {
    resumeText: 'Skills: Python',
    jobText: [
      'Title: Backend Engineer',
      'Company: Initech',
      'We are growing our platform team and need a strong backend engineer.',
      '',
      'Responsibilities:',
      'Design REST APIs',
      'Review pull requests',
      'Mentor junior engineers',
      '',
      'Required Skills: Python, SQL',
      'Benefits:',
      'Remote work',
      'Health insurance'
    ].join('\n')
  },
  expect: {
    'parsedJobDocument.title': 'Backend Engineer',
    'parsedJobDocument.company': 'Initech',
    'parsedJobDocument.description': 'contains:platform team',
    'parsedJobDocument.responsibilities': 'contains:Mentor junior engineers',
    'parsedJobDocument.benefits': 'contains:Health insurance',
    'parsedJobDocument.requiredSkills.length': '== 2'
  },
  rationale: [
    'Real job postings often open with an unlabeled paragraph before any labeled field, and use multi-line blocks for responsibilities/benefits, not just single "Label: value" lines - the current fixtures don\'t exercise this path, so it needed its own test.',
    'Same shape-first philosophy as ParsedResumeDocument: company/responsibilities/benefits exist in the type even though the repo\'s own fixtures never use them yet.'
  ]
});
