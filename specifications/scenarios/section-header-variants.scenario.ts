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
      'Professional Experience',
      'Frontend Developer at Acme Corp',
      '2022-2025',
      'Built React and TypeScript interfaces',
      '',
      'Academic Background',
      'BSc Computer Science, State University',
      '',
      'Volunteer Work',
      'Mentor at Code for Good, 2021-2023'
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
    'Adding a new header variant should only ever require editing the alias table in section-headers.ts, not this parser.'
  ]
});
