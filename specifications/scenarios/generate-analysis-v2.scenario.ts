import { Scenario } from '../runner/runner';

const resumeText = [
  'Jamie Rivera',
  '',
  'Skills',
  'React, TypeScript',
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
].join('\n');

const jobText = 'Required Skills: React, TypeScript\nMinExperienceYears: 1\nEducation: Bachelor\'s degree required';

Scenario({
  name: 'generateAnalysisV2 produces an honest breakdown/overall/confidence from Match<T>[] only, with no fabricated categories',
  given: { resumeText, jobText },
  expect: {
    'analysisV2.breakdown.skills': '== 100',
    'analysisV2.breakdown.experience': '== 75',
    'analysisV2.breakdown.education': '== 100',
    // Only categories a Match<T> producer actually evaluated are present -
    // skills, experience, education. No keywords/certifications/languages
    // key exists at all (proven by the count, since evaluateExpectation
    // treats an `undefined` expectation as "skip", not "must be absent").
    analysisV2BreakdownKeyCount: '== 3',
    'analysisV2.overall': '== 92',
    // Real average of every Match<T>'s own confidence (100, 100, 75, 100),
    // not V1's fixed 85-whenever-there-are-no-warnings.
    'analysisV2.confidence': '== 94',
    'analysisV2.gaps.length': '== 0',
    // 2 skills matched (React, TypeScript) + 1 experience strength + 1
    // education strength = 4. Was `== 2` before buildStrengths extended
    // strengths beyond skills-only, mirroring buildWeaknesses - see
    // build-strengths.scenario.ts for the dedicated coverage.
    'analysisV2.strengths.length': '== 4',
    'analysisV2.matches.length': '== 0'
  },
  rationale: [
    'generateAnalysisV2 is Parser -> Evidence -> Match<T> -> Score Engine end to end: parseResumeDocument/parseJobDocument feed matchSkills/matchExperience/matchEducation, and calculateSubscore/calculateOverallScore turn those into breakdown/overall - nothing here recomputes anything the individual Match<T> specs did not already prove.',
    'V1 always reports education/keywords/certifications/languages at a flat 100 whether or not anything was actually evaluated (see generate-analysis-v1.scenario comparison below); V2 leaves a category out of breakdown entirely when no Match<T> producer covers it yet, which calculateOverallScore already treats correctly.',
    '`matches` (the legacy MatchResult[] shape) is deliberately empty - MatchResult carries a per-item score, and inventing one here would reintroduce exactly the score-into-matching mixing this pipeline exists to avoid. The real per-match detail is on skillMatches/experienceMatch/educationMatch.'
  ]
});

Scenario({
  name: 'generateAnalysisV1 vs V2 on the same input: V1 fabricates untested categories and a fixed confidence, V2 does not',
  given: { resumeText, jobText },
  expect: {
    // V1's breakdown always includes these three at a flat 100 - the
    // pipeline never actually evaluates keywords, certifications, or
    // languages, it just assumes a perfect score for them.
    'analysisV1.breakdown.keywords': '== 100',
    'analysisV1.breakdown.certifications': '== 100',
    'analysisV1.breakdown.languages': '== 100',
    // V1's confidence is a fixed 85 whenever there are no warnings,
    // regardless of how strong or weak the underlying evidence actually was.
    'analysisV1.confidence': '== 85',
    // V2, run on the exact same resume/job text, reports only the
    // categories it evaluated and a confidence computed from real Match<T>
    // confidences (94, not 85) - see the scenario above for the exact
    // numbers.
    analysisV2BreakdownKeyCount: '== 3',
    'analysisV2.confidence': '== 94'
  },
  rationale: [
    'This is the comparison the two engines exist to enable: same resumeText/jobText through generateAnalysisV1 (analysisV1, called directly) and generateAnalysisV2 (analysisV2), so the difference in what gets fabricated vs. actually evaluated is visible in one spec rather than asserted separately in isolation.',
    'Updated 2026-07-18: generateAnalysis() (and so the top-level spread fields) is now V2-backed per ADR-004 - V1-specific assertions moved from bare top-level paths to analysisV1.* so this comparison keeps meaning what it always meant, instead of silently comparing V2 against itself.',
    'V1 is not deleted, only no longer the default - kept explicitly so this comparison, and specifications/reports/compare-v1-v2.ts, can keep running both.'
  ]
});
