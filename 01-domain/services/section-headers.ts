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

export interface HeaderScoreContext {
  // True while we're still in the name/title/contact block at the top of the
  // document and haven't found a real section yet. Short capitalized phrases
  // ("Software Engineer", "Machine Learning") are common right under a name
  // and must not be mistaken for a section boundary as easily as they would
  // be once we're already past the header block.
  inHeaderBlock?: boolean;
  blankLineBefore?: boolean;
}

// Deliberately excludes bare "work"/"lead" - too likely to be part of a
// legitimate header noun phrase ("Volunteer Work", "Team Lead") rather than
// a verb in a sentence. Past-tense/-ing forms are unambiguous enough to keep.
const SENTENCE_VERB_PATTERN =
  /\b(is|are|was|were|am|has|have|had|built|design(?:ed|ing)?|develop(?:ed|ing)?|manag(?:ed|ing)?|creat(?:ed|ing)?|implement(?:ed|ing)?|work(?:ed|ing)|respons(?:ible)?|collaborat\w*|improv\w*|increas\w*|reduc\w*|launch\w*|maintain(?:ed|ing)?|deliver(?:ed|ing)?)\b/i;

// Scores how much a line "looks like" a section header, even one we don't
// recognize yet. This is only ever called for lines that already failed
// matchCanonicalSection - so it does not re-check aliases, only shape:
//  +2 has an inline colon ("Volunteer Work: ...")
//  +1 four words or fewer
//  +1 Title Case or ALL CAPS
//  +1 immediately preceded by a blank line (typical section spacing)
//  -3 ends like a sentence (. , ;)
//  -2 contains a common resume action/being verb (bullet content, not a header)
//  -2 more than eight words (too long to be a header)
// Tune these weights in one place - this is the "config, not code" surface
// for header *detection*, same as SECTION_HEADER_ALIASES is for header
// *naming*.
export function scoreSectionHeader(line: string): number {
  const trimmed = line.trim();
  if (!trimmed) return -Infinity;

  const colonIndex = trimmed.indexOf(':');
  const hasColon = colonIndex !== -1;
  const candidate = (hasColon ? trimmed.slice(0, colonIndex) : trimmed).trim();
  if (!candidate || /^[-•*]/.test(candidate)) return -Infinity;

  let score = 0;
  if (hasColon) score += 2;

  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length <= 4) score += 1;
  if (words.length > 8) score -= 2;

  const letters = candidate.replace(/[^a-zA-Z]/g, '');
  if (letters) {
    const upperRatio = letters.replace(/[a-z]/g, '').length / letters.length;
    const isAllCaps = upperRatio > 0.8 && letters.length > 1;
    const isTitleCase = /^[A-Z][\w&/'-]*(\s[A-Z][\w&/'-]*)*$/.test(candidate);
    if (isAllCaps || isTitleCase) score += 1;
  }

  if (/[.,;]$/.test(candidate)) score -= 3;
  if (SENTENCE_VERB_PATTERN.test(candidate)) score -= 2;

  return score;
}

// Threshold is context-dependent: while still inside the header block (name
// / title / contact info, before any section has been found) we require a
// stronger signal, because that block is exactly where short capitalized
// phrases that are NOT section headers ("Software Engineer") are most
// likely to appear. Once we're past the header, a normal-strength signal is
// enough - real unfamiliar headers ("Volunteer Work") tend to also carry a
// blank line before them.
export function looksLikeSectionHeader(line: string, context: HeaderScoreContext = {}): boolean {
  if (line.trim().length > 60) return false;
  let score = scoreSectionHeader(line);
  if (context.blankLineBefore) score += 1;
  const threshold = context.inHeaderBlock ? 5 : 3;
  return score >= threshold;
}
