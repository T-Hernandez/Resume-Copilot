import { Analysis } from '../entities/analysis';
import { PipelineConfig } from '../entities/pipeline-config';
import { parseResumeDocument, ParsedResumeDocument } from './parse-resume-document';
import { parseJobDocument, ParsedJobDocument } from './parse-job-document';
import { matchSkills, SkillMatch } from '../matching/match-skill';
import { matchExperience, ExperienceMatch } from '../matching/match-experience';
import { matchEducation, EducationMatch } from '../matching/match-education';
import { detectDegreeLevel } from '../matching/degree-level';
import { calculateSubscore } from './calculate-subscore';
import { calculateOverallScore } from './calculate-overall-score';

export interface GenerateAnalysisV2Input {
  resumeText: string;
  jobText: string;
  pipelineConfig: PipelineConfig;
}

export interface GenerateAnalysisV2Pipeline {
  parsedResumeDocument: ParsedResumeDocument;
  parsedJobDocument: ParsedJobDocument;
  skillMatches: SkillMatch[];
  experienceMatch?: ExperienceMatch;
  educationMatch?: EducationMatch;
  analysis: Analysis;
}

// V2 of the analysis pipeline: Parser -> Evidence -> Match<T> -> Score Engine,
// built entirely from the components proven individually in
// match-skill/match-experience/match-education/score-engine specs. This does
// NOT replace generateAnalysisV1 - both are wired into the spec harness so
// results can be diffed on the same input while V2 earns trust. See ADR
// discussion in memory: retiring V1 is its own explicit decision, made later.
//
// Deliberate differences from V1, not oversights:
// - breakdown only contains categories a Match<T> producer actually covered
//   (skills, plus experience/education when the job stated a requirement).
//   V1 fabricates education/keywords/certifications/languages as a flat 100
//   when nothing was actually evaluated - V2 leaves them out instead of
//   pretending they were checked (calculateOverallScore already skips
//   missing categories, proven in score-engine.scenario.ts).
// - overall has no score-boosting floors (V1's `Math.max(overall, 80/90/95)`
//   once any skill matches). The Score Engine's weighted average is the
//   number, not a floor nudged up for a better-feeling result.
// - confidence is the real average of every Match<T>'s own confidence, not
//   a fixed 85 whenever there are no warnings.
// - `matches` (the legacy MatchResult[] shape) is intentionally left empty:
//   MatchResult carries a per-item `score`, and inventing one per match here
//   would be exactly the score-into-matching mixing this pipeline exists to
//   avoid. The real, richer data is `skillMatches`/`experienceMatch`/
//   `educationMatch` on the returned pipeline object, evidence included.
export function generateAnalysisV2(input: GenerateAnalysisV2Input): GenerateAnalysisV2Pipeline {
  const parsedResumeDocument = parseResumeDocument(input.resumeText);
  const parsedJobDocument = parseJobDocument(input.jobText);

  const skillMatches = matchSkills(parsedJobDocument.requiredSkills, parsedResumeDocument);

  const experienceMatch = parsedJobDocument.minExperienceYears !== undefined
    ? matchExperience({ minYears: parsedJobDocument.minExperienceYears }, parsedResumeDocument)
    : undefined;

  const requiredDegreeLevel = detectDegreeLevel(parsedJobDocument.educationLevel);
  const educationMatch = requiredDegreeLevel !== undefined
    ? matchEducation({ minLevel: requiredDegreeLevel }, parsedResumeDocument)
    : undefined;

  const breakdown: Record<string, number> = {
    skills: calculateSubscore(skillMatches),
    ...(experienceMatch ? { experience: calculateSubscore([experienceMatch]) } : {}),
    ...(educationMatch ? { education: calculateSubscore([educationMatch]) } : {})
  };
  const overall = calculateOverallScore(breakdown, input.pipelineConfig);

  const matchedSkills = skillMatches.filter(match => match.matched).map(match => match.query);
  const gaps = skillMatches.filter(match => !match.matched).map(match => match.query);

  const warnings: string[] = [];
  if (
    !parsedResumeDocument.skills.length &&
    !parsedResumeDocument.experience.length &&
    !parsedResumeDocument.education.length &&
    !parsedResumeDocument.summary
  ) {
    warnings.push('Empty resume');
  }

  const allMatches: Array<{ confidence: number }> = [
    ...skillMatches,
    ...(experienceMatch ? [experienceMatch] : []),
    ...(educationMatch ? [educationMatch] : [])
  ];
  const confidence = allMatches.length
    ? Math.round(allMatches.reduce((sum, match) => sum + match.confidence, 0) / allMatches.length)
    : 0;

  const analysis: Analysis = {
    id: 'analysis-resume-1-job-1',
    resumeId: 'resume-1',
    jobId: 'job-1',
    algorithmVersion: input.pipelineConfig.algorithmVersion,
    timestamp: new Date().toISOString(),
    overall,
    breakdown,
    matches: [],
    gaps,
    strengths: matchedSkills,
    warnings,
    confidence,
    metadata: {
      algorithmVersion: input.pipelineConfig.algorithmVersion,
      executionTime: 0,
      pipelineConfig: input.pipelineConfig,
      engine: 'v2'
    }
  };

  return {
    parsedResumeDocument,
    parsedJobDocument,
    skillMatches,
    experienceMatch,
    educationMatch,
    analysis
  };
}
