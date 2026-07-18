import { Experience } from '../entities/experience';
import { Education } from '../entities/education';
import { SkillInstance } from '../entities/skill';
import { parseResumeSections } from './parse-resume-sections';
import { parseExperienceSection } from './parse-experience';
import { parseEducationSection } from './parse-education';
import { parseSkillsSection } from './parse-skills';

// Single entry point for turning raw resume text into every structured
// piece Phase 2 knows how to extract. Callers (executor.ts today, the
// domain's generateAnalysis pipeline later) depend on this shape instead of
// wiring parseResumeSections + parseExperienceSection + ... together
// themselves - so adding the next parser, or swapping the text source for
// PDF/DOCX extraction upstream, only changes this one file.
//
// projects/certifications/languages are still raw text: their specialized
// parsers don't exist yet. Each will move from `string` to a structured
// type here, one at a time, as it's built - this is an expected,
// one-field-at-a-time shape evolution, not a design gap.
export interface ParsedResumeDocument {
  header: string;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: SkillInstance[];
  projects?: string;
  certifications?: string;
  languages?: string;
  other?: string[];
}

export function parseResumeDocument(text: string): ParsedResumeDocument {
  const sections = parseResumeSections(text);

  return {
    header: sections.header,
    summary: sections.summary,
    experience: parseExperienceSection(sections.experience),
    education: parseEducationSection(sections.education),
    skills: parseSkillsSection(sections.skills),
    projects: sections.projects,
    certifications: sections.certifications,
    languages: sections.languages,
    other: sections.other
  };
}
