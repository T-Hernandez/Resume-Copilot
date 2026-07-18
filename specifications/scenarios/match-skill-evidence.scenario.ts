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
    // two independent pieces of evidence, both reasons present.
    'skillMatches.0.query': 'React',
    'skillMatches.0.matched': true,
    'skillMatches.0.confidence': '== 100',
    'skillMatches.0.evidence.length': '== 2',
    'skillMatches.0.reasons.0': 'canonical-skill',
    'skillMatches.0.reasons.1': 'mentioned-in-experience',

    // Docker: NOT in the Skills section at all - only found because a bullet
    // mentions it. This is exactly the case a plain skills-list == skills-list
    // comparison would miss entirely.
    'skillMatches.1.query': 'Docker',
    'skillMatches.1.matched': true,
    'skillMatches.1.confidence': '== 80',
    'skillMatches.1.evidence.length': '== 1',
    'skillMatches.1.evidence.0.source': 'resume.experience',
    'skillMatches.1.evidence.0.location.experienceIndex': '== 0',
    'skillMatches.1.reasons.0': 'mentioned-in-experience',

    // GraphQL: nowhere in the resume - matched must be false, not a low
    // score. No evidence and no reasons to fabricate a justification for.
    'skillMatches.2.query': 'GraphQL',
    'skillMatches.2.matched': false,
    'skillMatches.2.confidence': '== 0',
    'skillMatches.2.evidence.length': '== 0',
    'skillMatches.2.reasons.length': '== 0'
  },
  rationale: [
    'A skill mentioned only in an experience bullet (Docker) must still match - matching against the Skills section alone misses real evidence, which is the whole point of an Evidence Builder over a flat list comparison.',
    'matchSkill() never returns a score or percentage - only matched/confidence/evidence/reasons. Turning this into a number is the Score Engine\'s job, still to come.',
    'reasons are machine-readable tags derived directly from evidence sources, not prose - they exist to debug, test, and eventually feed the LLM report without it having to infer why a match happened.'
  ]
});
