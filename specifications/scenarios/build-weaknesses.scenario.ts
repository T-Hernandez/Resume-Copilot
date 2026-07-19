import { Scenario } from '../runner/runner';

Scenario({
  name: 'generateAnalysisV2 populates weaknesses across skills, experience, and education - a field V1 never set at all',
  given: {
    resumeText: [
      'Jamie Rivera',
      '',
      'Skills',
      'React',
      '',
      'Experience',
      'Company A',
      'Software Engineer',
      '2019 - 2021',
      '',
      'Education',
      'State University',
      'BSc Computer Science',
      '2016 - 2020'
    ].join('\n'),
    jobText: "Required Skills: React, Python\nMinExperienceYears: 5\nEducation: Master's degree required"
  },
  expect: {
    'analysisV2.weaknesses.length': '== 3',
    'analysisV2.weaknesses.0': 'Missing required skill: Python',
    'analysisV2.weaknesses.1': 'Experience requirement not met: job requires 5+ years',
    'analysisV2.weaknesses.2': 'Education requirement not met: job requires at least a master degree'
  },
  rationale: [
    'First deterministic piece of Fase 2 (Analisis inteligente): Analysis.weaknesses exists on the type but neither generateAnalysisV1 nor generateAnalysisV2 populated it before this - buildWeaknesses() fills it from Match<T> data only (matched/query), the same evidence-grounded standard the rest of the pipeline is held to.',
    'Covers all three Match<T> categories in one scenario: a skill genuinely absent (Python), an experience shortfall (2 real years vs 5 required), and an education shortfall (bachelor vs required master) - proving weaknesses is not skills-only the way gaps/strengths currently are.',
    'Deliberately does not touch gaps or strengths - those are already tested, already consumed as skill-name lists, and changing their shape was out of scope for this increment.'
  ]
});
