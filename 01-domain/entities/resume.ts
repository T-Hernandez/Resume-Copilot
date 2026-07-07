import { SkillInstance } from './skill';
import { Experience } from './experience';
import { Education } from './education';

export interface Resume {
  id: string;
  name?: string;
  contact?: { email?: string; phone?: string };
  summary?: string;
  skills: SkillInstance[];
  experience: Experience[];
  education?: Education[];
  languages?: { name: string; level?: string }[];
  certifications?: string[];
  projects?: { name: string; description?: string; skills?: string[] }[];
  // raw original source (kept for auditability), do not modify in-domain
  raw?: unknown;
}

export interface ParsedResume extends Resume {
  // marker interface for a parsed representation
}

export interface NormalizedResume extends Resume {
  // marker for a normalized resume (skills canonicalized, dates normalized)
}
