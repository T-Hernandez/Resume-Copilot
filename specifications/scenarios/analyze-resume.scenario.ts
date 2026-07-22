import { Scenario } from '../runner/runner';

Scenario({
  name: 'analyzeResumeOnly extracts skills/experience/education with no job to compare against, and no warnings on a complete resume',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'React, TypeScript, CSS',
      '',
      'Experience',
      'Company A',
      'Software Engineer',
      '2019 - 2021',
      '- Built the checkout flow',
      '',
      'Education',
      'State University',
      "Bachelor's in Computer Science",
      '2015 - 2019'
    ].join('\n'),
    jobText: ''
  },
  expect: {
    'resumeInsight.skills.length': '== 3',
    'resumeInsight.experience.length': '== 1',
    'resumeInsight.education.length': '== 1',
    'resumeInsight.totalExperienceYears': '== 2',
    'resumeInsight.warnings.length': '== 0'
  },
  rationale: [
    'A candidate does not always have a specific job posting to compare against - generateAnalysis()/compareResumesToJob both require one, so this is the first entry point that only runs the Parser stage (parseResumeDocument) and reports what was actually understood, with nothing matched or scored.',
    'A resume with a clean entry in every section should produce zero warnings - warnings exist to flag genuine ambiguity, not to editorialize on a complete document.'
  ]
});

Scenario({
  name: 'analyzeResumeOnly reports "Empty resume" once, not a warning per missing section, when nothing could be extracted at all',
  given: {
    resumeText: '',
    jobText: ''
  },
  expect: {
    'resumeInsight.skills.length': '== 0',
    'resumeInsight.experience.length': '== 0',
    'resumeInsight.education.length': '== 0',
    'resumeInsight.totalExperienceYears': '== 0',
    'resumeInsight.warnings.length': '== 1',
    'resumeInsight.warnings.0': 'Empty resume - nothing could be extracted'
  },
  rationale: [
    'Mirrors generateAnalysisV2\'s own "Empty resume" warning - three separate "No X section detected" lines for a blank document is noise, not information; one clear message says the same thing better.'
  ]
});

Scenario({
  name: 'analyzeResumeOnly flags a genuinely missing section on an otherwise-populated resume, without claiming the resume is empty',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'React'
    ].join('\n'),
    jobText: ''
  },
  expect: {
    'resumeInsight.skills.length': '== 1',
    'resumeInsight.experience.length': '== 0',
    'resumeInsight.education.length': '== 0',
    'resumeInsight.warnings.length': '== 2',
    'resumeInsight.warnings.0': 'No experience section detected',
    'resumeInsight.warnings.1': 'No education section detected'
  },
  rationale: [
    'A resume with only a Skills section is real and common (e.g. an early-career candidate) - it must not be lumped in with a genuinely empty document, but the reader should still be told which sections it could not find.'
  ]
});
