import { Scenario } from '../runner/runner';

// Deliberately avoids the exact header wording used by examples/ and
// fixtures/ ("Skills:", "Experience:"). If this only passes because the
// parser memorized those literal strings, it will fail here.
Scenario({
  name: 'Section parser recognizes header variants and preserves unknown sections',
  given: {
    resumeText: [
      'Jamie Rivera',
      'Frontend Engineer',
      '',
      'Technical Skills',
      'React, TypeScript, CSS',
      '',
      'Volunteer Work',
      'Mentor at Code for Good, 2021-2023',
      '',
      'Professional Experience',
      'Frontend Developer at Acme Corp',
      '2022-2025',
      'Built React and TypeScript interfaces',
      '',
      'Academic Background',
      'BSc Computer Science, State University'
    ].join('\n'),
    jobText: 'Required Skills: React\nMinExperienceYears: 1',
    pipelineConfig: {
      algorithmVersion: '0.2.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    'parsedDocument.metadata.sectionCount': '>= 3',
    'resumeSections.skills': 'contains:React',
    'resumeSections.experience': 'contains:Acme',
    'resumeSections.education': 'contains:Computer',
    'resumeSections.other.length': '>= 1'
  },
  rationale: [
    'Real resumes use many header phrasings ("Technical Skills", "Core Competencies", "Stack"...) - the parser must not overfit to the exact wording in the fixtures.',
    'Headers the parser does not recognize yet must stay isolated in `other` instead of silently merging into the previous section.',
    'Adding a new header variant should only ever require editing the alias table in section-headers.ts, not this parser.',
    'The unknown-header heuristic is deliberately suppressed while inside Experience/Education (see the other new scenario) - so this fixture places the unrecognized header after Skills instead, where it is unambiguous.'
  ]
});

// Guards against the opposite failure mode: a short, capitalized, blank-line
// -isolated phrase in the name/title block ("Software Engineer") getting
// mistaken for a section boundary and torn out of the header.
Scenario({
  name: 'A role title under the candidate name is not mistaken for a section header',
  given: {
    resumeText: [
      'Alex Kim',
      '',
      'Software Engineer',
      '',
      'Skills',
      'Python, SQL, AWS',
      '',
      'Experience',
      'Backend Engineer at Initech',
      '2020-2023',
      'Reduced latency across services'
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
    'resumeSections.header': 'contains:Software Engineer',
    'resumeSections.skills': 'contains:Python',
    'resumeSections.experience': 'contains:Initech'
  },
  rationale: [
    'A job title sitting right under the candidate name is common and must stay part of the header block, not become its own phantom section.',
    'The header-detection heuristic uses a stricter threshold while still inside the unclosed header block precisely to avoid this false positive.'
  ]
});
