import { Scenario } from '../runner/runner';

Scenario({
  name: 'Experience and education parsers extract structured entries from multiple blocks',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Professional Experience',
      'Google',
      'Software Engineer',
      'Jan 2023 - Present',
      'Built scalable APIs',
      'Designed microservices architecture',
      '',
      'Acme Corp',
      'Backend Engineer',
      '2020 - 2022',
      'Reduced latency by 30%',
      '',
      'Academic Background',
      'State University',
      'BSc Computer Science',
      '2016 - 2020'
    ].join('\n'),
    jobText: 'Required Skills: Python\nMinExperienceYears: 1',
    pipelineConfig: {
      algorithmVersion: '0.2.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    'parsedResumeDocument.experience.0.company': 'Google',
    'parsedResumeDocument.experience.0.title': 'Software Engineer',
    'parsedResumeDocument.experience.0.startDate': '2023-01',
    'parsedResumeDocument.experience.0.endDate': 'present',
    'parsedResumeDocument.experience.0.bullets.length': '>= 2',
    'parsedResumeDocument.experience.0.parseConfidence': '>= 85',
    'parsedResumeDocument.experience.1.company': 'Acme Corp',
    'parsedResumeDocument.experience.1.title': 'Backend Engineer',
    'parsedResumeDocument.experience.1.startDate': '2020',
    'parsedResumeDocument.experience.1.endDate': '2022',
    'parsedResumeDocument.education.0.institution': 'State University',
    'parsedResumeDocument.education.0.degree': 'BSc Computer Science',
    'parsedResumeDocument.education.0.endDate': '2020',
    'parsedResumeDocument.education.0.parseConfidence': '>= 85'
  },
  rationale: [
    'A resume with two jobs must produce two Experience entries, not one blob - blank lines inside a section are the entry boundary.',
    'Dates in prose form ("Jan 2023 - Present") must resolve to a structured startDate/endDate, same as plain year ranges.',
    'The "Title at Company" convention and the "Company / Title on separate lines" convention must both resolve to the same shape.',
    'Education uses the same entry-splitting and date extraction, keyed off institution/degree instead of company/title.',
    'A clean entry with a date, both fields, and (for experience) bullets should score high parseConfidence - it is not a random number.'
  ]
});

Scenario({
  name: 'Existing "Title at Company" fixture convention still parses into a structured Experience entry',
  given: {
    resumePath: 'examples/resume-frontend-junior.txt',
    jobPath: 'examples/job-react.txt'
  },
  expect: {
    'parsedResumeDocument.experience.0.title': 'Frontend Developer'
  },
  rationale: [
    'The parsers must work on the real example fixtures already in the repo, not just purpose-built test text.'
  ]
});

Scenario({
  name: 'An ambiguous experience entry (no connector, no date, no bullets) scores low parseConfidence',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Experience',
      'Something Vague'
    ].join('\n'),
    jobText: 'Required Skills: Python\nMinExperienceYears: 1'
  },
  expect: {
    'parsedResumeDocument.experience.0.parseConfidence': '<= 45'
  },
  rationale: [
    'A single unconnected line with no date and no bullets is a guess, not a fact - parseConfidence must say so instead of pretending certainty.'
  ]
});
