import { SkillInstance } from '../entities/skill';
import { DefaultSkillNormalizer } from './skill-normalizer';

const BULLET_PREFIX = /^[-•*●▪◦‣]\s*/;
// "Frontend:" / "Backend & Tools:" - short, ends in a colon, no comma (a
// real skill list line with a colon, e.g. "Skills: React, Node", would
// already have been stripped of its section header by parseResumeSections
// before this ever runs).
const CATEGORY_HEADER = /^([A-Za-z][\w /&-]{1,30}):$/;

function splitTokens(line: string): string[] {
  return line
    .split(/[,;]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

// Level inference ("Advanced", "C1") is explicitly out of scope for this
// pass - a trailing parenthetical is dropped rather than parsed.
function stripQualifier(token: string): string {
  return token.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function scoreSkillConfidence(token: string, hadExplicitSeparator: boolean): number {
  let score = 70;
  if (hadExplicitSeparator) score += 20;
  const wordCount = token.split(/\s+/).filter(Boolean).length;
  score += wordCount <= 3 ? 10 : -20;
  return Math.max(10, Math.min(100, score));
}

// Phase 2: turns the flat `skills` blob from parseResumeSections into
// individual skill instances. Handles the shapes that cover most real
// resumes - comma/semicolon lists, one-per-line (bulleted or not), and
// category-grouped blocks ("Frontend:\nReact\n\nBackend:\nNode") - without
// trying to be a general-purpose list parser.
export function parseSkillsSection(sectionText: string | undefined): SkillInstance[] {
  if (!sectionText || !sectionText.trim()) return [];

  const normalizer = new DefaultSkillNormalizer();
  const results: SkillInstance[] = [];
  const seen = new Set<string>();
  let currentCategory: string | undefined;

  for (const rawLine of sectionText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const categoryMatch = line.match(CATEGORY_HEADER);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim().toLowerCase();
      continue;
    }

    const withoutBullet = line.replace(BULLET_PREFIX, '');
    const isBullet = withoutBullet !== line;
    const tokens = splitTokens(withoutBullet).map(stripQualifier).filter(Boolean);
    const hadExplicitSeparator = tokens.length > 1 || isBullet || currentCategory !== undefined;

    for (const token of tokens) {
      const dedupeKey = `${currentCategory || ''}::${token.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const normalized = normalizer.normalizeSkill({
        raw: token,
        confidence: scoreSkillConfidence(token, hadExplicitSeparator)
      });

      results.push(currentCategory ? { ...normalized, category: currentCategory } : normalized);
    }
  }

  return results;
}
