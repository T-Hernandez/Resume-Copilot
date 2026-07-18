import { Scenario } from '../runner/runner';

Scenario({
  name: 'matchSkill builds evidence-based matches, not scores - skills-list, experience-only, and no-match cases',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'React, TypeScript',
      '',
      'Experience',
      'Frontend Developer at Acme Corp',
      '2022-2025',
      'Built dashboards using React, Docker and CI pipelines'
    ].join('\n'),
    jobText: 'Required Skills: React, Docker, GraphQL\nMinExperienceYears: 1'
  },
  expect: {
    // React: appears in the Skills section AND is mentioned in a bullet -
    // two independent pieces of evidence. "Why" is only in evidence.source
    // now - there is no separate reasons list to keep in sync with it.
    'skillMatches.0.query': 'React',
    'skillMatches.0.matched': true,
    'skillMatches.0.confidence': '== 100',
    'skillMatches.0.evidence.length': '== 2',
    'skillMatches.0.evidence.0.source': 'resume.skills',
    'skillMatches.0.evidence.1.source': 'resume.experience',

    // Docker: NOT in the Skills section at all - only found because a bullet
    // mentions it. This is exactly the case a plain skills-list == skills-list
    // comparison would miss entirely.
    'skillMatches.1.query': 'Docker',
    'skillMatches.1.matched': true,
    'skillMatches.1.confidence': '== 80',
    'skillMatches.1.evidence.length': '== 1',
    'skillMatches.1.evidence.0.source': 'resume.experience',
    'skillMatches.1.evidence.0.location.experienceIndex': '== 0',

    // GraphQL: nowhere in the resume - matched must be false, not a low
    // score. No evidence to fabricate a justification for.
    'skillMatches.2.query': 'GraphQL',
    'skillMatches.2.matched': false,
    'skillMatches.2.confidence': '== 0',
    'skillMatches.2.evidence.length': '== 0'
  },
  rationale: [
    'A skill mentioned only in an experience bullet (Docker) must still match - matching against the Skills section alone misses real evidence, which is the whole point of an Evidence Builder over a flat list comparison.',
    'matchSkill() never returns a score or percentage - only matched/confidence/evidence. Turning this into a number is the Score Engine\'s job, still to come.',
    'There is no separate `reasons` field: evidence[].source already says why a match happened, so that is the only place "why" is recorded.'
  ]
});

Scenario({
  name: 'matchSkill finds mentions of skills whose names end in symbols (C++, C#) - \\b word-boundary regex misses these',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'Java',
      '',
      'Experience',
      'Backend Developer at Initech',
      '2019-2022',
      'Shipped services in C++ and maintained a legacy C# codebase'
    ].join('\n'),
    jobText: 'Required Skills: C++, C#, Python\nMinExperienceYears: 1'
  },
  expect: {
    'skillMatches.0.query': 'C++',
    'skillMatches.0.matched': true,
    'skillMatches.0.evidence.0.source': 'resume.experience',
    'skillMatches.1.query': 'C#',
    'skillMatches.1.matched': true,
    'skillMatches.1.evidence.0.source': 'resume.experience',
    'skillMatches.2.query': 'Python',
    'skillMatches.2.matched': false
  },
  rationale: [
    'A plain \\bC\\+\\+\\b regex never matches "C++" followed by whitespace or punctuation, because \\b requires a word/non-word transition on both sides and "+" is already non-word - so a naive word-boundary matcher would silently miss every C++ and C# mention. The lookaround-based boundary check must catch both.'
  ]
});
