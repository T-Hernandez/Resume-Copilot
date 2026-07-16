import * as fs from 'fs';
import * as path from 'path';
import { DefaultSkillNormalizer } from '../../01-domain/services/skill-normalizer';

type Given = { resumePath?: string; jobPath?: string; resumeText?: string; jobText?: string };

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
  if (!resumeText || !jobText) throw new Error('Missing resume or job text');

  // parse resume simple fields
  const resume = parseResumeSimple(resumeText);
  const job = parseJobSimple(jobText);

  // normalization: extract skills and canonicalize
  const normalizer = new DefaultSkillNormalizer();
  const resumeSkills = normalizer.normalizeSkills(extractSkillsSimple(resumeText)).map(s => s.canonical || s.raw);
  const jobReq = normalizer.normalizeSkills(job.requiredSkills || []).map(s => s.canonical || s.raw);

  // matching: count overlaps
  const matched = jobReq.filter(s => resumeSkills.includes(s));
  const missing = jobReq.filter(s => !resumeSkills.includes(s));

  const skillsScore = jobReq.length === 0 ? 0 : Math.round((matched.length / jobReq.length) * 100);
  // experience: naive years matching
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

  const analysis = {
    overall,
    breakdown,
    matches: matched.map((s: string, i: number) => ({ id: `m_${i}`, type: 'skill', resumeRef: s, jobRef: s, score: 100, confidence: 90, reason: 'Exact match', evidence: ['Skills section'] })),
    gaps: missing,
    confidence: Math.round((resume.textQuality || 80)),
    metadata: { executor: 'spec-harness-v0' }
  } as any;

  return analysis;
}

function normalizeSkills(list: string[]) {
  const normalizer = new DefaultSkillNormalizer();
  return normalizer.normalizeSkills(list).map(s => s.canonical || s.raw);
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

