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
  name: 'analyzeResumeOnly warns that total experience may be understated instead of silently reporting 0 years, when entries state a year but no end date',
  given: {
    resumeText: [
      'Andres Hernandez',
      '',
      'Skills',
      'React',
      '',
      'Experience',
      '2025',
      'Company A',
      'AI Product Developer',
      '- Built a React app',
      '',
      '2024',
      'Company B',
      'Cybersecurity Assistant',
      '- Reported clandestine casinos',
      '',
      'Education',
      'State University',
      "Bachelor's in Computer Science",
      '2015 - 2019'
    ].join('\n'),
    jobText: ''
  },
  expect: {
    'resumeInsight.experience.length': '== 2',
    'resumeInsight.experience.0.startDate': '2025',
    'resumeInsight.totalExperienceYears': '== 0',
    'resumeInsight.warnings.length': '== 1',
    'resumeInsight.warnings.0': 'Could not compute a duration for 2 experience entries - a start or end date is missing, so total experience may be understated'
  },
  rationale: [
    'Two real, cleanly-parsed jobs (each stating only the year it started, no end date) previously summed to "0 years" with no explanation at all - indistinguishable from an actually-empty work history. That is a misleading claim, not an honest one, the exact category of problem confidence: undefined already exists to avoid on the matched path.',
    'The warning fires only when an entry states *some* date but not enough to compute a duration - a fully dateless entry is already covered by the separate low-parseConfidence warning, so this does not double-warn about the same root cause.'
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
