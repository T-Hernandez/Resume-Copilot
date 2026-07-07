export interface Job {
  id: string;
  title: string;
  rawText: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  minExperienceYears?: number;
  educationLevel?: string;
  keywords?: string[];
}

export interface ParsedJob extends Job {}
