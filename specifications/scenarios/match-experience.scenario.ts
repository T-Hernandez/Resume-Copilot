import { Scenario } from '../runner/runner';

Scenario({
  name: 'matchExperience sums durations across multiple Experience entries and matches against MinExperienceYears',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Experience',
      'Frontend Developer at Acme Corp',
      '2018 - 2020',
      'Built dashboards',
      '',
      'Backend Engineer at Initech',
      '2020 - 2023',
      'Designed APIs'
    ].join('\n'),
    jobText: 'Required Skills: React\nMinExperienceYears: 4'
  },
  expect: {
    'experienceMatch.query.minYears': '== 4',
    'experienceMatch.matched': true,
    // 2018-2020 (2y) + 2020-2023 (3y) = 5y >= 4y required.
    'experienceMatch.evidence.length': '== 2',
    'experienceMatch.confidence': '== 100',
    'scoreEngineBreakdown.experience': '== 100'
  },
  rationale: [
    'matchExperience follows the exact same Evidence Builder -> Matching Engine shape as matchSkill, reusing Match<T> and matchConfidence unchanged - no Score Engine code needed to change for a second Match<T> producer to exist.',
    'Total years comes from summing each Experience entry\'s own duration, not a single hardcoded "experience.length" proxy.'
  ]
});

Scenario({
  name: 'matchExperience: an entry with no parseable dates contributes no evidence, and a confident "not enough" is not the same as "no data"',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Experience',
      'Contractor at Various Clients',
      '2023 - 2024',
      'Consulted on projects',
      '',
      'Freelance work',
      'Helped small businesses'
    ].join('\n'),
    jobText: 'Required Skills: React\nMinExperienceYears: 5'
  },
  expect: {
    // The second entry ("Freelance work", no date line at all) is skipped by
    // the Evidence Builder entirely - it is not counted as 0 years, it is
    // simply not evidence. Only the first entry (1 year) counts, well short
    // of the 5 required.
    'experienceMatch.matched': false,
    'experienceMatch.evidence.length': '== 1',
    // Despite not matching, confidence stays high - the one entry we DO
    // have is cleanly parsed (title/company/date/bullets all present), so
    // this is a confident "no", not an "I don't know". Collapsing these two
    // into one number would hide the difference.
    'experienceMatch.confidence': '== 100'
  },
  rationale: [
    'experienceDurationYears() returns undefined (not 0) for an entry it cannot compute a duration for, and buildExperienceEvidence skips those entries rather than fabricating a duration - matches the same "don\'t invent evidence" principle as the skill Evidence Builder.',
    'matched and confidence answer different questions: whether the requirement is met, and how much to trust that answer. A resume can clearly fail a requirement while the match engine is still very sure about it.'
  ]
});
