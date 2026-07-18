import { Analysis } from '../entities/analysis';
import { Job } from '../entities/job';
import { PipelineConfig } from '../entities/pipeline-config';
import { Resume } from '../entities/resume';
import { generateAnalysisV1 } from './generate-analysis-v1';
import { buildDocumentPipeline } from './document-processing-pipeline';

export interface AnalysisGenerator {
  generate(resume: Resume, job: Job, pipelineConfig: PipelineConfig): Promise<Analysis> | Analysis;
}

export interface GenerateAnalysisInput {
  resume: Resume | string;
  job: Job | string;
  pipelineConfig: PipelineConfig;
}

export interface GenerateAnalysisPipeline {
  parsedResume: Resume;
  parsedJob: Job;
  analysis: Analysis;
}

export function generateAnalysis(input: GenerateAnalysisInput): GenerateAnalysisPipeline {
  const resumeInput = typeof input.resume === 'string' ? parseResumeText(input.resume) : {
    ...input.resume,
    skills: (input.resume.skills || []).map((skill, index) => ({
      id: `skill-${index + 1}`,
      raw: typeof skill === 'string' ? skill : skill.raw,
      canonical: typeof skill === 'string' ? undefined : skill.canonical,
      confidence: typeof skill === 'string' ? 100 : skill.confidence ?? 100
    }))
  };

  const jobInput = typeof input.job === 'string' ? parseJobText(input.job) : {
    ...input.job,
    requiredSkills: input.job.requiredSkills || []
  };

  const analysis = generateAnalysisV1(resumeInput, jobInput, input.pipelineConfig);

  return {
    parsedResume: resumeInput,
    parsedJob: jobInput,
    analysis
  };
}

function parseResumeText(text: string): Resume {
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

function parseJobText(text: string): Job {
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
