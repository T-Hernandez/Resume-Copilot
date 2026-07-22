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
  name: 'A bare year on its own line ("2025") is read as an experience entry\'s start date, in front of or behind the role',
  given: {
    resumeText: [
      'Andres Hernandez',
      '',
      'Experience',
      '2025',
      'Ameliapp',
      'AI & Product Developer',
      '- Building a React-based application',
      '',
      'Kiggu',
      'Cybersecurity Reporting Assistant',
      '2024',
      '- One month of work experience'
    ].join('\n'),
    jobText: ''
  },
  expect: {
    'parsedResumeDocument.experience.length': '== 2',
    'parsedResumeDocument.experience.0.company': 'Ameliapp',
    'parsedResumeDocument.experience.0.title': 'AI & Product Developer',
    'parsedResumeDocument.experience.0.startDate': '2025',
    'parsedResumeDocument.experience.1.company': 'Kiggu',
    'parsedResumeDocument.experience.1.title': 'Cybersecurity Reporting Assistant',
    'parsedResumeDocument.experience.1.startDate': '2024'
  },
  rationale: [
    'A single year with no range ("2025", not "2024 - 2025") is a real, common convention - especially timeline-style templates that put the year as its own label rather than inline with the role - and previously produced zero date signal at all, because extractDateRange only recognizes ranges.',
    'The year is pulled out before company/title detection runs regardless of whether it sits before (first entry) or after (second entry) the role lines, so it never gets mistaken for a title/company candidate itself (the naive fix - just adding a single-date branch to the existing per-line loop - would have done exactly that when the year comes first, consuming the slot the real company/title lines needed).',
    'Read as a start date, never a fabricated end date ("Present" is not implied) - matches this codebase\'s standing rule against inventing facts the source text does not state.'
  ]
});

Scenario({
  name: 'A dash-separated "Title — Company" line is read correctly, not just the "Company — Title" default',
  given: {
    resumeText: [
      'Andres Hernandez',
      '',
      'Experience',
      'AI & Product Developer — Ameliapp',
      '- Building a React-based application',
      '',
      'Acme Corp — Frontend Developer',
      '- Shipped the checkout redesign'
    ].join('\n'),
    jobText: ''
  },
  expect: {
    'parsedResumeDocument.experience.0.title': 'AI & Product Developer',
    'parsedResumeDocument.experience.0.company': 'Ameliapp',
    'parsedResumeDocument.experience.1.company': 'Acme Corp',
    'parsedResumeDocument.experience.1.title': 'Frontend Developer'
  },
  rationale: [
    'The dash convention is genuinely ambiguous both ways in real resumes - "AI & Product Developer — Ameliapp" (title first) and "Acme Corp — Frontend Developer" (company first, the pre-existing default and every real fixture under examples/) both need to resolve correctly in the same pass.',
    'A recognizable job-title keyword (Developer, Engineer, ...) on exactly one side is the signal used to pick the direction - every existing dash-separated fixture already has the keyword on the second side, so this is additive: it only changes the read when the keyword is on the first side instead, which used to always be misread as the company.'
  ]
});

Scenario({
  name: 'An unbulleted description paragraph is not mistaken for the job title, when it directly follows a real title with no connector',
  given: {
    resumeText: [
      'Andres Hernandez',
      '',
      'Experience',
      'Cybersecurity Reporting Assistant - Kiggu',
      'One month of work experience identifying, analyzing and reporting clandestine virtual casinos to Coljuegos, the Colombian gaming regulator.'
    ].join('\n'),
    jobText: ''
  },
  expect: {
    'parsedResumeDocument.experience.0.title': 'Cybersecurity Reporting Assistant',
    'parsedResumeDocument.experience.0.company': 'Kiggu',
    'parsedResumeDocument.experience.0.bullets.length': '== 1'
  },
  rationale: [
    'Previously, with no date and no bullet marker, the fallback positional guess blindly took the first 2 lines as company/title - swallowing this entire unbulleted sentence as if it were the second meta line, instead of recognizing it as the entry\'s (unbulleted) description.',
    'A sentence-length line (many words, or ending in sentence punctuation) is not what a real company/title line looks like - it now stops the positional guess early and lands in bullets instead, even though it was never actually bulleted in the source text.',
    'The meta line itself ("Cybersecurity Reporting Assistant - Kiggu") also now splits into title/company: a plain hyphen padded by whitespace on both sides is accepted as a separator (COMPANY_HYPHEN_TITLE) - a compound-word hyphen like "Front-end Developer" never has surrounding spaces, so this does not collide with the reason the plain-hyphen case was originally excluded from COMPANY_DASH_TITLE.'
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

Scenario({
  name: 'A label/value-style entry (date alone on its own line, then title, then company, no connector) resolves company and title instead of reading them as bullets',
  given: {
    resumeText: [
      'Taylor Rivera',
      '',
      'Work experience',
      '2023 - Present',
      'Backend Engineer',
      'Nimbus Labs'
    ].join('\n'),
    jobText: ''
  },
  expect: {
    'parsedResumeDocument.experience.0.company': 'Nimbus Labs',
    'parsedResumeDocument.experience.0.title': 'Backend Engineer',
    'parsedResumeDocument.experience.0.startDate': '2023'
  },
  rationale: [
    'A timeline/label-value template (the shape Europass-style CVs commonly use) puts the date range entirely on its own line, with the role and company as separate lines AFTER it, not before - the opposite of the inline-date convention ("Frontend Developer (2021-2024)") the date-line-bounds-the-meta-content logic elsewhere in this file assumes. Previously this left metaLines empty (the date consumed its own only line) and both "Backend Engineer" and "Nimbus Labs" fell through to bullets, with parseConfidence 45 - a low-confidence non-answer despite both facts being right there in the text.',
    'The two borrowed lines still need a company/title order, and a plain position-based default ("first line is company") would have gotten this specific pair backwards - "Backend Engineer" (title) comes before "Nimbus Labs" (company) here. The same TITLE_KEYWORDS-on-exactly-one-side signal already used to resolve the dash conventions decides the order here too, instead of guessing positionally.'
  ]
});
