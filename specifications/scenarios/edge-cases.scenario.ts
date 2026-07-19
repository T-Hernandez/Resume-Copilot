import { Scenario } from '../runner/runner';

Scenario({
  name: 'Empty resume produces zeroed analysis and warning',
  given: {
    resumeText: '',
    jobText: 'Required Skills: React\nMinExperienceYears: 2',
    pipelineConfig: {
      algorithmVersion: '0.1.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    overall: '== 0',
    confidence: '== 0',
    'warnings': 'contains:Empty resume'
  },
  rationale: [
    'An empty resume should not produce a misleading score.',
    'The analysis should explicitly warn about the missing input.'
  ]
});

Scenario({
  name: 'Unknown skills do not invalidate unrelated evidence',
  given: {
    resumeText: 'Skills: React, ReactXtreme',
    jobText: 'Required Skills: React',
    pipelineConfig: {
      algorithmVersion: '0.1.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    'skillMatches.length': '== 1',
    'skillMatches.0.matched': true,
    'scoreEngineBreakdown.skills': '== 100'
  },
  rationale: [
    'This replaces the old "Unknown skills produce warnings" scenario, which was pinning a real V1 bug in place rather than protecting a guarantee: V1 zeroed the ENTIRE analysis (overall, every breakdown category, confidence) the moment ANY resume skill fell outside a small hardcoded whitelist - one unrecognized token like "ReactXtreme" would wipe out a real, valid React match sitting right next to it.',
    'The new architecture has no equivalent mechanism: an unrecognized skill simply produces no evidence for itself and never touches any other skill\'s match - confirmed live via the V1/V2 comparator (see npm run compare) across multiple real fixtures before this rewrite.'
  ]
});

Scenario({
  name: 'Duplicate aliases collapse into one match per required skill, not one per resume alias',
  given: {
    resumeText: 'Skills: React, ReactJS, React.js',
    jobText: 'Required Skills: React',
    pipelineConfig: {
      algorithmVersion: '0.1.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    'skillMatches.length': '== 1'
  },
  rationale: [
    'Repeated resume-side aliases for the same skill must not inflate the number of matches - matchSkills() produces exactly one SkillMatch per job-required skill by construction (jobSkills.map(matchSkill)), never one per resume mention, so three aliases for "React" against one required "React" still yields skillMatches.length === 1, with all three aliases collapsed into that single match\'s evidence array instead.',
    'This is the Match<T>-era equivalent of the old "collapse duplicate MatchResults" guarantee - the mechanism moved from post-hoc deduplication (V1\'s matches.filter(...findIndex...)) to a structural one-match-per-query design that cannot produce duplicates in the first place.'
  ]
});
