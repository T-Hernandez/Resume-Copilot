import * as fs from 'fs';
import * as path from 'path';
import { DefaultSkillNormalizer } from '../../01-domain/services/skill-normalizer';
import { generateAnalysis } from '../../01-domain/services/generate-analysis';
import { buildDocumentPipeline } from '../../01-domain/services/document-processing-pipeline';
import { parseResumeSections } from '../../01-domain/services/parse-resume-sections';
import { parseResumeDocument } from '../../01-domain/services/parse-resume-document';

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

  const pipeline = generateAnalysis({
    resume: resumeText,
    job: jobText,
    pipelineConfig: {
      algorithmVersion: given.pipelineConfig?.algorithmVersion || '0.0.0',
      weights: given.pipelineConfig?.weights || { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15, certifications: 0.05, languages: 0.05 },
      thresholds: given.pipelineConfig?.thresholds || {},
      partialMatchScore: given.pipelineConfig?.partialMatchScore || 70
    } as any
  });

  return {
    ...pipeline.analysis,
    parsedResume: pipeline.parsedResume,
    parsedJob: pipeline.parsedJob,
    parsedDocument,
    resumeSections,
    parsedResumeDocument,
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

