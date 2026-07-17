export type CanonicalSection =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages';

export const CANONICAL_SECTIONS: CanonicalSection[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages'
];

// Adding a new header variant is a one-line edit here, never a code change
// to the parser. Keep aliases lowercase; matching is case-insensitive.
export const SECTION_HEADER_ALIASES: Record<CanonicalSection, string[]> = {
  summary: ['summary', 'professional summary', 'profile', 'objective', 'about', 'about me'],
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'employment history',
    'work history',
    'career history'
  ],
  education: ['education', 'academic background', 'academics', 'education & training'],
  skills: [
    'skills',
    'technical skills',
    'technologies',
    'technology stack',
    'tech stack',
    'stack',
    'core competencies',
    'competencies',
    'technical competencies',
    'skills & tools',
    'skills and tools'
  ],
  projects: ['projects', 'portfolio', 'personal projects', 'selected projects'],
  certifications: ['certifications', 'certificates', 'licenses', 'licenses & certifications'],
  languages: ['languages', 'spoken languages']
};

function normalizeHeaderLine(line: string): string {
  return line
    .trim()
    .replace(/:$/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Headers may appear alone on a line ("Skills") or inline with their content
// ("Skills: React, Node") - only the part before the colon is the header.
export function matchCanonicalSection(line: string): CanonicalSection | undefined {
  const trimmed = line.trim();
  const colonIndex = trimmed.indexOf(':');
  const candidate = colonIndex === -1 ? trimmed : trimmed.slice(0, colonIndex);
  const normalized = normalizeHeaderLine(candidate);
  for (const section of CANONICAL_SECTIONS) {
    if (SECTION_HEADER_ALIASES[section].includes(normalized)) return section;
  }
  return undefined;
}

export function inlineContentAfterHeader(line: string): string {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return '';
  return line.slice(colonIndex + 1).trim();
}

// Heuristic for "this line is probably a section header, even one we don't
// recognize yet" — short, no sentence-ending punctuation, not a bullet line,
// and mostly capitalized. This is what lets Phase 1 keep unfamiliar headers
// (e.g. "Volunteer Work") as their own section instead of silently merging
// their content into whatever section came before.
export function looksLikeSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 40) return false;
  if (/[.,;]$/.test(trimmed)) return false;
  if (/^[-•*•]/.test(trimmed)) return false;
  if (matchCanonicalSection(trimmed)) return true;

  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (!letters) return false;
  const upperRatio = letters.replace(/[a-z]/g, '').length / letters.length;
  const isTitleOrUpperCase = upperRatio > 0.5 || /^[A-Z][\w&/'-]*(\s[A-Z][\w&/'-]*)*:?$/.test(trimmed);
  const wordCount = trimmed.split(/\s+/).length;
  return isTitleOrUpperCase && wordCount <= 5;
}
