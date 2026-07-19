import * as fs from 'fs';
import * as path from 'path';
import { DefaultSkillNormalizer } from '../../01-domain/services/skill-normalizer';
import { generateAnalysis } from '../../01-domain/services/generate-analysis';
import { buildDocumentPipeline } from '../../01-domain/services/document-processing-pipeline';
import { parseResumeSections } from '../../01-domain/services/parse-resume-sections';
import { parseResumeDocument } from '../../01-domain/services/parse-resume-document';
import { parseJobDocument } from '../../01-domain/services/parse-job-document';
import { matchSkills } from '../../01-domain/matching/match-skill';
import { matchExperience } from '../../01-domain/matching/match-experience';
import { matchEducation } from '../../01-domain/matching/match-education';
import { detectDegreeLevel } from '../../01-domain/matching/degree-level';
import { calculateSubscore } from '../../01-domain/services/calculate-subscore';
import { calculateOverallScore } from '../../01-domain/services/calculate-overall-score';
import { generateAnalysisV2 } from '../../01-domain/services/generate-analysis-v2';
import { generateAnalysisV1, parseResumeTextV1, parseJobTextV1 } from '../../01-domain/services/generate-analysis-v1';
import { buildRecommendationInput } from '../../01-domain/services/build-recommendation-input';
import { PipelineConfig } from '../../01-domain/entities/pipeline-config';

type Given = { resumePath?: string; jobPath?: string; resumeText?: string; jobText?: string; pipelineConfig?: any };

function readText(p?: string) {
  if (!p) return '';
  const full = path.resolve(p);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

// Extremely small, opinionated parser/engine to produce a basic Analysis object
export async function runScenario(given: Given) {
  const resumeText = given.resumeText ?? readText(given.resumePath);
  const jobText = given.jobText ?? readText(given.jobPath);

  const documentPipeline = buildDocumentPipeline(resumeText);
  const parsedDocument = documentPipeline.parsedDocument;
  // Phase 1 (raw sections) is kept separate from Phase 2 (parseResumeDocument,
  // the structured orchestrator) because specs test each layer independently
  // - header/section-boundary detection here, company/title/date extraction
  // there. Neither is yet wired into the scoring path below (see ADR
  // discussion: resumeYears in scoring is currently experience.length, a
  // placeholder that real multi-entry parsing would perturb).
  const resumeSections = parseResumeSections(resumeText);
  const parsedResumeDocument = parseResumeDocument(resumeText);
  const parsedJobDocument = parseJobDocument(jobText);
  // Evidence-based matching: separate from the score-mixing matchResumeToJob
  // path below on purpose (see ADR discussion in memory) - matchSkill()
  // never produces points, only matched/confidence/evidence.
  const skillMatches = matchSkills(parsedJobDocument.requiredSkills, parsedResumeDocument);
  // ExperienceMatch follows the exact same Evidence Builder -> Matching
  // Engine shape as SkillMatch, reusing Match<T>/matchConfidence - only
  // built when the job actually states a minimum, same reasoning as
  // matchSkills over an empty requiredSkills list (nothing to compare
  // against isn't a match failure, it's an absent category).
  const experienceMatch = parsedJobDocument.minExperienceYears !== undefined
    ? matchExperience({ minYears: parsedJobDocument.minExperienceYears }, parsedResumeDocument)
    : undefined;
  // EducationMatch, third Match<T> producer, exact same shape again. The
  // job's educationLevel is still raw text (no structured Job-side parser
  // for it yet) - detectDegreeLevel() is the one place that turns "Bachelor's
  // degree required" into a comparable DegreeLevel, same job
  // detectDegreeLevel already does for a resume's own degree text.
  const requiredDegreeLevel = detectDegreeLevel(parsedJobDocument.educationLevel);
  const educationMatch = requiredDegreeLevel !== undefined
    ? matchEducation({ minLevel: requiredDegreeLevel }, parsedResumeDocument)
    : undefined;

  // Score Engine: consumes Match<T>[] only, never resume/job text directly.
  // keywords/etc. still don't have a Match<T> implementation, so they're
  // left out of the breakdown entirely rather than faked with a placeholder
  // subscore - calculateOverallScore already skips categories missing from
  // the breakdown (proven in score-engine.scenario.ts). Still not wired
  // into the `overall` used by the live V1 analysis below (pipeline.analysis)
  // - exposed separately as scoreEngine* so specs can verify it on its own.
  const scoreEnginePipelineConfig: PipelineConfig = {
    algorithmVersion: given.pipelineConfig?.algorithmVersion || '0.0.0',
    weights: given.pipelineConfig?.weights || { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15 }
  };
  const scoreEngineBreakdown: Record<string, number> = {
    skills: calculateSubscore(skillMatches),
    ...(experienceMatch ? { experience: calculateSubscore([experienceMatch]) } : {}),
    ...(educationMatch ? { education: calculateSubscore([educationMatch]) } : {})
  };
  const scoreEngineOverall = calculateOverallScore(scoreEngineBreakdown, scoreEnginePipelineConfig);

  // generateAnalysisV2: the full Parser -> Evidence -> Match<T> -> Score
  // Engine pipeline, producing an Analysis-shaped result the same way V1
  // does (pipeline.analysis below), so scenarios can diff analysisV2.analysis
  // against the legacy .overall/.breakdown/.confidence side by side on the
  // exact same input. V1 is untouched - this is purely additive.
  const analysisV2 = generateAnalysisV2({
    resumeText,
    jobText,
    pipelineConfig: scoreEnginePipelineConfig
  });
  // Deterministic "context" step for Fase 2: packages Analysis's own facts
  // into the shape a future RecommendationGenerator (LLM, infra layer) is
  // allowed to read - exposed here only so specs can verify the packaging
  // itself, independent of any LLM wiring (which does not exist yet).
  const recommendationInput = buildRecommendationInput(analysisV2.analysis);

  const resume = parseResumeSimple(resumeText);
  const job = parseJobSimple(jobText);

  const normalizer = new DefaultSkillNormalizer();
  const resumeSkills = normalizer.normalizeSkills(documentPipeline.structuredResume.skills.map(skill => skill.raw)).map(s => s.canonical || s.raw);
  const jobReq = normalizer.normalizeSkills(job.requiredSkills || []).map(s => s.canonical || s.raw);

  const matched = jobReq.filter(s => resumeSkills.includes(s));
  const skillsScore = jobReq.length === 0 ? 0 : Math.round((matched.length / jobReq.length) * 100);
  const expScore = Math.min(100, Math.round((resume.years || 0) / (job.minExperienceYears || 1) * 100));

  const breakdown: Record<string, number> = { skills: skillsScore, experience: expScore, education: 100, keywords: 100, certifications: 100, languages: 100 };
  const weights = { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15, certifications: 0.05, languages: 0.05 };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [k, weight] of Object.entries(weights)) {
    const value = breakdown[k] ?? 100;
    weightedSum += value * (weight as number);
    totalWeight += (weight as number);
  }
  const overall = Math.round(weightedSum / totalWeight);

  // Live default path - generateAnalysis() is V2-backed since the
  // 2026-07-18 migration (ADR-004). Reuses scoreEnginePipelineConfig rather
  // than rebuilding an equivalent object - V2 only ever reads
  // algorithmVersion/weights; thresholds/partialMatchScore were V1-only
  // metadata passthrough that never affected scoring (neither field is
  // referenced anywhere in generate-analysis-v1.ts's logic).
  const pipeline = generateAnalysis({
    resume: resumeText,
    job: jobText,
    pipelineConfig: scoreEnginePipelineConfig
  });

  // analysisV1: the raw V1 engine, called directly (generateAnalysis() no
  // longer routes to it) so specs comparing V1's old fabricated-category/
  // fixed-confidence behavior against V2 still have a real V1 result to
  // point at (see generate-analysis-v2.scenario.ts's comparison scenario).
  const analysisV1 = generateAnalysisV1(
    parseResumeTextV1(resumeText),
    parseJobTextV1(jobText),
    {
      algorithmVersion: given.pipelineConfig?.algorithmVersion || '0.0.0',
      weights: given.pipelineConfig?.weights || { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15, certifications: 0.05, languages: 0.05 }
    }
  );

  return {
    ...pipeline.analysis,
    analysisV1,
    parsedDocument,
    resumeSections,
    parsedResumeDocument,
    parsedJobDocument,
    skillMatches,
    experienceMatch,
    educationMatch,
    scoreEngineBreakdown,
    scoreEngineOverall,
    analysisV2: analysisV2.analysis,
    recommendationInput,
    // Exposed only so specs can prove analysisV2.breakdown contains exactly
    // the categories a Match<T> producer actually covered - no more, no
    // less - without needing an "expected undefined" check the runner
    // can't express (evaluateExpectation treats `undefined` as "skip").
    analysisV2BreakdownKeyCount: Object.keys(analysisV2.analysis.breakdown).length,
    metadata: {
      ...pipeline.analysis.metadata,
      executor: 'spec-harness-v0',
      pipelineConfig: given.pipelineConfig || pipeline.analysis.metadata?.pipelineConfig || {}
    }
  };
}

function normalizeSkills(list: string[]) {
  const normalizer = new DefaultSkillNormalizer();
  return normalizer.normalizeSkills(list).map(s => s.canonical || s.raw);
}

function normalizeSkillsToInstances(list: string[]) {
  const normalizer = new DefaultSkillNormalizer();
  return normalizer.normalizeSkills(list);
}

function parseResumeSimple(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const skillsLine = lines.find(l => l.toLowerCase().startsWith('skills:')) || '';
  const skills = skillsLine.split(':')[1]?.split(',')?.map(s => s.trim())?.filter(Boolean) || [];
  // naive years: look for (YYYY-YYYY) in experience lines
  const years = (text.match(/\b(19|20)\d{2}\b/g) || []).length ? 2 : 1;
  return { skills, years, textQuality: 90 };
}

function parseJobSimple(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const reqLine = lines.find(l => l.toLowerCase().startsWith('required skills:')) || '';
  const requiredSkills = reqLine.split(':')[1]?.split(/[,;]+/)?.map(s => s.trim())?.filter(Boolean) || [];
  const minExpLine = lines.find(l => l.toLowerCase().startsWith('minexperienceyears:')) || '';
  const minExp = parseInt(minExpLine.split(':')[1] || '0', 10) || 0;
  return { requiredSkills, minExperienceYears: minExp };
}

function extractSkillsSimple(text: string) {
  const skillsLine = text.split(/\r?\n/).find(l => l.toLowerCase().startsWith('skills:')) || '';
  return skillsLine.split(':')[1]?.split(/[,;]+/)?.map(s => s.trim())?.filter(Boolean) || [];
}

