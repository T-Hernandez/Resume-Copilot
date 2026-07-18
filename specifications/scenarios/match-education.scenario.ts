import { Scenario } from '../runner/runner';

Scenario({
  name: "matchEducation resolves a candidate's highest degree level and matches it against the job's requirement",
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Education',
      'State University',
      'BSc Computer Science',
      '2016 - 2020'
    ].join('\n'),
    jobText: "Required Skills: React\nMinExperienceYears: 1\nEducation: Bachelor's degree required"
  },
  expect: {
    'educationMatch.query.minLevel': 'bachelor',
    'educationMatch.matched': true,
    'educationMatch.evidence.length': '== 1',
    'educationMatch.evidence.0.source': 'resume.education',
    'educationMatch.confidence': '== 100',
    'scoreEngineBreakdown.education': '== 100'
  },
  rationale: [
    'matchEducation is the third Match<T> producer built the same way as SkillMatch and ExperienceMatch - Score Engine code did not change at all to support it.',
    'The job\'s educationLevel and the resume\'s own degree text both go through the same detectDegreeLevel() keyword table - one place that knows what "bachelor" means, not two.'
  ]
});

Scenario({
  name: 'matchEducation: a bachelor\'s degree does not satisfy a master\'s requirement, but the match stays confident, not uncertain',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Education',
      'State University',
      'BSc Computer Science',
      '2016 - 2020'
    ].join('\n'),
    jobText: "Required Skills: React\nMinExperienceYears: 1\nEducation: Master's degree required"
  },
  expect: {
    'educationMatch.query.minLevel': 'master',
    'educationMatch.matched': false,
    'educationMatch.evidence.length': '== 1',
    // Same principle as the ExperienceMatch "confident no" spec: the
    // resume clearly states a bachelor's degree, it's just below the bar -
    // that is a confident reading, not a lack of data.
    'educationMatch.confidence': '== 100'
  },
  rationale: [
    'A clearly-stated degree that simply falls short of the requirement must not be indistinguishable from "the resume said nothing about education" - matched and confidence answer different questions, same as in ExperienceMatch.'
  ]
});
