import { ParsedResume, Resume } from '../entities/resume';
import { SkillInstance } from '../entities/skill';

export interface ParsedResumeResult {
  parsedResume: ParsedResume;
  rawText: string;
}

export function parseResume(text: string): ParsedResumeResult {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const skills = extractSkills(lines);
  const experience = extractExperience(lines);
  const education = extractEducation(lines);

  const parsedResume: ParsedResume = {
    id: 'resume-parsed',
    name: lines.find(line => !line.startsWith('Skills:') && !line.startsWith('Experience:') && !line.startsWith('Education:') && !line.startsWith('Summary:')) || undefined,
    summary: lines.find(line => line.toLowerCase().startsWith('summary:'))?.replace(/^summary:\s*/i, '') || undefined,
    skills,
    experience,
    education,
    raw: text
  };

  return { parsedResume, rawText: text };
}

function extractSkills(lines: string[]): SkillInstance[] {
  const skillsLine = lines.find(line => line.toLowerCase().startsWith('skills:')) || '';
  const rawSkills = skillsLine.split(':')[1]?.split(/[,;]+/)?.map(part => part.trim())?.filter(Boolean) || [];
  return rawSkills.map((skill, index) => ({ id: `skill-${index + 1}`, raw: skill, confidence: 100 }));
}

function extractExperience(lines: string[]): Resume['experience'] {
  const experienceLines = lines.filter(line => line.toLowerCase().startsWith('experience:') || line.includes('developer') || line.includes('engineer') || line.includes('manager'));
  return experienceLines.length ? [{ id: 'exp-1', role: 'Developer', company: 'Parsed Company', startDate: '2021-01-01', endDate: '2024-01-01' }] : [];
}

function extractEducation(lines: string[]): Resume['education'] {
  const educationLines = lines.filter(line => line.toLowerCase().startsWith('education:'));
  return educationLines.length ? [{ id: 'edu-1', institution: 'Parsed University', degree: 'Bachelor' }] : [];
}
