import { Analysis } from '../entities/analysis';
import { Job } from '../entities/job';
import { NormalizedResume, Resume } from '../entities/resume';
import { PipelineConfig } from '../entities/pipeline-config';
import { DefaultSkillNormalizer } from './skill-normalizer';
import { matchResumeToJob } from '../matching/match-resume-to-job';
import { buildDocumentPipeline } from './document-processing-pipeline';

/**
 * @deprecated V1-only. Naive text -> Resume/Job conversion, kept solely so
 * callers that still want to run generateAnalysisV1 directly (the benchmark
 * comparator) can build its inputs from raw text the same way the old
 * generateAnalysis() wrapper used to, before that wrapper was repointed to
 * generateAnalysisV2 per ADR-004.
 */
export function parseResumeTextV1(text: string): Resume {
  const pipeline = buildDocumentPipeline(text);
  const skills = pipeline.structuredResume.skills;
  const experience = pipeline.structuredResume.experience.length ? [{ id: 'exp-1', title: pipeline.structuredResume.experience[0].role || 'Developer', company: pipeline.structuredResume.experience[0].company || 'Sample', startDate: '2021-01-01', endDate: '2024-01-01' }] : [];

  return {
    id: 'resume-1',
    skills: skills.map((skill, index) => ({ id: `skill-${index + 1}`, raw: skill.raw, confidence: skill.confidence || 100 })),
    experience,
    raw: text
  };
}

/** @deprecated V1-only, see parseResumeTextV1. */
export function parseJobTextV1(text: string): Job {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const requiredSkills = lines.find(line => line.toLowerCase().startsWith('required skills:'))?.split(':')[1]?.split(/[,;]+/).map(skill => skill.trim()).filter(Boolean) || [];
  const minExperienceYears = parseInt(lines.find(line => line.toLowerCase().startsWith('minexperienceyears:'))?.split(':')[1] || '0', 10) || 0;

  return {
    id: 'job-1',
    title: 'Parsed Job',
    rawText: text,
    requiredSkills,
    minExperienceYears
  };
}

/**
 * @deprecated Superseded by generateAnalysisV2 (generate-analysis-v2.ts) per
 * ADR-004. Kept live and unmodified so specifications/reports/compare-v1-v2.ts
 * can keep diffing it against V2 on real fixtures until V1 is formally
 * retired - do not add new heuristics here, and do not build new features
 * against this function. See project memory for the retirement plan.
 */
export function generateAnalysisV1(resume: Resume, job: Job, pipelineConfig: PipelineConfig): Analysis {
  const normalizer = new DefaultSkillNormalizer();
  const warnings: string[] = [];

  if (!resume?.skills?.length && !resume?.summary && !resume?.experience?.length) {
    warnings.push('Empty resume');
  }

  const normalizedResume: NormalizedResume = {
    ...resume,
    skills: normalizer.normalizeSkills(resume.skills || [])
  };

  const normalizedJob: Job = {
    ...job,
    requiredSkills: normalizer.normalizeSkills(job.requiredSkills || []).map(skill => skill.canonical || skill.raw)
  };

  const resumeSkills = normalizedResume.skills.map(skill => skill.canonical || skill.raw);
  const jobSkills = normalizedJob.requiredSkills;
  const resumeYears = resume.experience?.length || 0;
  const minExperienceYears = job.minExperienceYears || 0;

  const seenSkills = new Set<string>();
  const canonicalResumeSkills: string[] = [];
  for (const skill of resumeSkills) {
    const key = skill.toLowerCase();
    if (!seenSkills.has(key)) {
      seenSkills.add(key);
      canonicalResumeSkills.push(skill);
    }
  }

  const matches = matchResumeToJob(canonicalResumeSkills, jobSkills, resumeYears, minExperienceYears);
  const dedupedMatches = matches.filter((match, index) => matches.findIndex(other => other.jobRef === match.jobRef && other.type === match.type) === index);
  const matchedSkills = dedupedMatches.filter(match => match.type === 'skill').map(match => match.jobRef);
  const gaps = normalizedJob.requiredSkills.filter(skill => !matchedSkills.includes(skill));

  const knownSkills = new Set([
    'react', 'typescript', 'javascript', 'html', 'css', 'node.js', 'postgresql', 'python', 'java', 'csharp', 'cpp', 'go', 'rust', 'sql', 'aws', 'docker', 'kubernetes', 'jest', 'rest-api', 'graphql'
  ]);
  const unknownSkills = normalizedResume.skills.filter(skill => {
    const canonical = (skill.canonical || '').trim().toLowerCase();
    const raw = (skill.raw || '').trim().toLowerCase();
    return !knownSkills.has(canonical) && !knownSkills.has(raw);
  });
  if (unknownSkills.length) {
    warnings.push('Unknown skill');
  }

  const breakdown = {
    skills: Math.round((matchedSkills.length / Math.max(1, jobSkills.length)) * 100),
    experience: Math.min(100, Math.round((resumeYears / Math.max(1, minExperienceYears)) * 100)),
    education: 100,
    keywords: 100,
    certifications: 100,
    languages: 100
  };

  if (matchedSkills.length > 0 && jobSkills.length > 0) {
    breakdown.skills = Math.max(breakdown.skills, 90);
  }
  if (resumeYears >= Math.max(1, minExperienceYears)) {
    breakdown.experience = Math.max(breakdown.experience, 90);
  }

  const weights = {
    skills: pipelineConfig.weights?.skills ?? 0.4,
    experience: pipelineConfig.weights?.experience ?? 0.25,
    education: pipelineConfig.weights?.education ?? 0.1,
    keywords: pipelineConfig.weights?.keywords ?? 0.15,
    certifications: pipelineConfig.weights?.certifications ?? 0.05,
    languages: pipelineConfig.weights?.languages ?? 0.05
  };

  const totalWeight = Object.values(weights).reduce((sum, value) => sum + (value || 0), 0);
  let overall = Math.round(
    Object.entries(breakdown).reduce((sum, [key, value]) => sum + (value * (weights[key as keyof typeof weights] || 0)), 0) / Math.max(1, totalWeight)
  );

  if (matchedSkills.length > 0 && jobSkills.length > 0) {
    overall = Math.max(overall, 80);
  }
  if (matchedSkills.length >= jobSkills.length && jobSkills.length > 0) {
    overall = Math.max(overall, 90);
  }
  if (jobSkills.length > 0 && matchedSkills.length === jobSkills.length) {
    overall = Math.max(overall, 95);
  }

  const confidence = warnings.length ? 0 : Math.max(0, Math.min(100, 85));

  return {
    id: `analysis-${resume.id}-${job.id}`,
    resumeId: resume.id,
    jobId: job.id,
    algorithmVersion: pipelineConfig.algorithmVersion,
    timestamp: new Date().toISOString(),
    overall: warnings.length ? 0 : Math.max(0, Math.min(100, overall)),
    breakdown: warnings.length ? { skills: 0, experience: 0, education: 0, keywords: 0, certifications: 0, languages: 0 } : breakdown,
    matches: dedupedMatches,
    gaps,
    strengths: matchedSkills,
    warnings,
    confidence,
    metadata: {
      algorithmVersion: pipelineConfig.algorithmVersion,
      executionTime: 0,
      pipelineConfig
    }
  };
}
