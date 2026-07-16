import { Analysis } from '../entities/analysis';
import { Job } from '../entities/job';
import { NormalizedResume, Resume } from '../entities/resume';
import { PipelineConfig } from '../entities/pipeline-config';
import { DefaultSkillNormalizer } from './skill-normalizer';
import { matchResumeToJob } from '../matching/match-resume-to-job';

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

  const overall = Math.round(
    (dedupedMatches.reduce((sum, match) => sum + match.score, 0) / Math.max(1, dedupedMatches.length)) * (pipelineConfig.weights.skills ? 1 : 1)
  );

  const breakdown = {
    skills: Math.round((matchedSkills.length / Math.max(1, jobSkills.length)) * 100),
    experience: Math.min(100, Math.round((resumeYears / Math.max(1, minExperienceYears)) * 100)),
    education: 100,
    keywords: 100,
    certifications: 100,
    languages: 100
  };

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
