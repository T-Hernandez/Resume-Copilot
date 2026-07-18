export type JobField =
  | 'title'
  | 'company'
  | 'description'
  | 'requiredSkills'
  | 'preferredSkills'
  | 'minExperienceYears'
  | 'educationLevel'
  | 'responsibilities'
  | 'benefits'
  | 'keywords';

export const JOB_FIELDS: JobField[] = [
  'title',
  'company',
  'description',
  'requiredSkills',
  'preferredSkills',
  'minExperienceYears',
  'educationLevel',
  'responsibilities',
  'benefits',
  'keywords'
];

// Same "config, not code" philosophy as section-headers.ts's
// SECTION_HEADER_ALIASES: adding a new label wording is a one-line edit
// here. Job postings tend to be explicitly labeled ("Title:", "Required
// Skills:") rather than needing the header-detection heuristics resumes do.
export const JOB_FIELD_LABELS: Record<JobField, string[]> = {
  title: ['title', 'job title', 'position', 'role'],
  company: ['company', 'organization', 'employer'],
  description: ['description', 'summary', 'about the role', 'about this role'],
  requiredSkills: ['required skills', 'requirements', 'must have', 'must-have skills'],
  preferredSkills: ['preferred', 'preferred skills', 'nice to have', 'nice-to-have', 'bonus skills'],
  minExperienceYears: ['minexperienceyears', 'minimum experience', 'min experience years', 'years of experience'],
  educationLevel: ['education', 'education level', 'required education'],
  responsibilities: ['responsibilities', 'what you will do', "what you'll do", 'duties'],
  benefits: ['benefits', 'perks', 'what we offer'],
  keywords: ['keywords', 'tags']
};

// Fields whose inline value is a delimited list ("React; TypeScript") rather
// than free text.
export const JOB_LIST_FIELDS: JobField[] = ['requiredSkills', 'preferredSkills', 'keywords'];

// Fields that read as one block of prose/bullets rather than a single line
// ("Responsibilities:" followed by several lines).
export const JOB_BLOCK_FIELDS: JobField[] = ['description', 'responsibilities', 'benefits'];

function normalizeLabel(line: string): string {
  return line.trim().replace(/:$/, '').replace(/\s+/g, ' ').toLowerCase();
}

export function matchJobField(line: string): JobField | undefined {
  const trimmed = line.trim();
  const colonIndex = trimmed.indexOf(':');
  const candidate = colonIndex === -1 ? trimmed : trimmed.slice(0, colonIndex);
  const normalized = normalizeLabel(candidate);
  for (const field of JOB_FIELDS) {
    if (JOB_FIELD_LABELS[field].includes(normalized)) return field;
  }
  return undefined;
}

export function inlineValueAfterLabel(line: string): string {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return '';
  return line.slice(colonIndex + 1).trim();
}
