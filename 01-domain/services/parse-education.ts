import { Education } from '../entities/education';
import { extractDateRange } from './parse-date-range';

const INSTITUTION_KEYWORDS = /\b(university|college|institute|school|polytechnic)\b/i;

function splitEntryBlocks(sectionText: string): string[] {
  return sectionText
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);
}

interface InstitutionAndDegree {
  institution?: string;
  degree?: string;
  // Whether an institution keyword ("University", "College"...) told us how
  // to assign the slots, vs. a positional guess. Feeds parseConfidence.
  fromKeywordMatch: boolean;
}

function parseInstitutionAndDegree(metaLines: string[]): InstitutionAndDegree {
  if (!metaLines.length) return { fromKeywordMatch: false };

  if (metaLines.length === 1) {
    const line = metaLines[0];
    const commaIndex = line.indexOf(',');
    if (commaIndex === -1) {
      return INSTITUTION_KEYWORDS.test(line)
        ? { institution: line, fromKeywordMatch: true }
        : { degree: line, fromKeywordMatch: false };
    }
    const before = line.slice(0, commaIndex).trim();
    const after = line.slice(commaIndex + 1).trim();
    if (INSTITUTION_KEYWORDS.test(after)) return { degree: before, institution: after, fromKeywordMatch: true };
    if (INSTITUTION_KEYWORDS.test(before)) return { institution: before, degree: after, fromKeywordMatch: true };
    return { degree: before, institution: after, fromKeywordMatch: false };
  }

  // Two or more lines: whichever one names an institution wins that slot.
  // Falls back to "institution first, degree second" - the same documented
  // assumption parseExperienceSection makes for company/title.
  const institutionLine = metaLines.find(line => INSTITUTION_KEYWORDS.test(line));
  if (institutionLine) {
    return {
      institution: institutionLine,
      degree: metaLines.find(line => line !== institutionLine),
      fromKeywordMatch: true
    };
  }
  return { institution: metaLines[0], degree: metaLines[1], fromKeywordMatch: false };
}

// 0..100, same scale and same rationale as scoreExperienceConfidence in
// parse-experience.ts.
function scoreEducationConfidence(args: {
  hasInstitution: boolean;
  hasDegree: boolean;
  fromKeywordMatch: boolean;
  hasDate: boolean;
}): number {
  let score = 20;
  if (args.hasInstitution) score += 25;
  if (args.hasDegree) score += 25;
  if (args.fromKeywordMatch) score += 15;
  if (args.hasDate) score += 15;
  return Math.min(100, score);
}

function parseEntry(block: string): Education {
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
  if (!lines.length) return {};

  let startDate: string | undefined;
  let endDate: string | undefined;
  const working = [...lines];

  for (let i = 0; i < working.length; i++) {
    const range = extractDateRange(working[i]);
    if (range) {
      startDate = range.startDate;
      endDate = range.endDate;
      working[i] = range.remainder;
      break;
    }
  }

  // No explicit range - a bare graduation year ("2020") is common.
  if (!endDate) {
    const yearIndex = working.findIndex(line => /^\d{4}$/.test(line.trim()));
    if (yearIndex !== -1) {
      endDate = working[yearIndex].trim();
      working[yearIndex] = '';
    }
  }

  const metaLines = working.filter(Boolean);
  const { institution, degree, fromKeywordMatch } = parseInstitutionAndDegree(metaLines);

  const entry: Education = {};
  if (institution) entry.institution = institution;
  if (degree) entry.degree = degree;
  if (startDate) entry.startDate = startDate;
  if (endDate) entry.endDate = endDate;
  entry.parseConfidence = scoreEducationConfidence({
    hasInstitution: Boolean(institution),
    hasDegree: Boolean(degree),
    fromKeywordMatch,
    hasDate: Boolean(startDate || endDate)
  });
  return entry;
}

// Phase 2: turns the flat `education` blob from parseResumeSections into
// structured entries, mirroring parseExperienceSection's approach.
export function parseEducationSection(sectionText: string | undefined): Education[] {
  if (!sectionText || !sectionText.trim()) return [];
  return splitEntryBlocks(sectionText).map((block, index) => ({
    id: `edu-${index + 1}`,
    ...parseEntry(block)
  }));
}
