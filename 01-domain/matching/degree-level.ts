import { Education } from '../entities/education';
import { textMentions } from './text-mentions';

export type DegreeLevel = 'high-school' | 'associate' | 'bachelor' | 'master' | 'doctorate';

const DEGREE_RANK: Record<DegreeLevel, number> = {
  'high-school': 0,
  associate: 1,
  bachelor: 2,
  master: 3,
  doctorate: 4
};

// Config, not code, same philosophy as SECTION_HEADER_ALIASES: a new phrasing
// is a one-line edit here. Checked from highest to lowest in detectDegreeLevel
// so "Master of Science" resolves to 'master', not 'bachelor' via a loose
// "science" keyword some other level might contain.
const DEGREE_KEYWORDS: Record<DegreeLevel, string[]> = {
  doctorate: ['phd', 'ph.d', 'doctorate', 'doctoral'],
  master: ['master', 'msc', 'm.sc', 'mba', 'ma', 'ms'],
  bachelor: ['bachelor', 'bsc', 'b.sc', 'licenciatura', 'ingenieria', 'ingeniería', 'ba', 'bs'],
  associate: ['associate degree', 'associate'],
  'high-school': ['high school diploma', 'high school', 'ged']
};

const LEVELS_HIGH_TO_LOW: DegreeLevel[] = ['doctorate', 'master', 'bachelor', 'associate', 'high-school'];

export function degreeLevelRank(level: DegreeLevel): number {
  return DEGREE_RANK[level];
}

export function detectDegreeLevel(text: string | undefined): DegreeLevel | undefined {
  if (!text) return undefined;
  for (const level of LEVELS_HIGH_TO_LOW) {
    if (DEGREE_KEYWORDS[level].some(keyword => textMentions(text, keyword))) return level;
  }
  return undefined;
}

// The decision (which entry counts, and what the candidate's ceiling is)
// belongs in the Matching Engine, not the Evidence Builder - mirrors
// totalExperienceYears() being computed separately from
// buildExperienceEvidence() in experience-duration.ts.
export function highestDegreeLevel(entries: Education[]): DegreeLevel | undefined {
  let highest: DegreeLevel | undefined;
  for (const entry of entries) {
    const level = detectDegreeLevel(entry.degree);
    if (!level) continue;
    if (!highest || degreeLevelRank(level) > degreeLevelRank(highest)) highest = level;
  }
  return highest;
}
