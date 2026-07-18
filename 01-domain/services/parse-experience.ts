import { Experience } from '../entities/experience';
import { extractDateRange } from './parse-date-range';

const BULLET_PREFIX = /^[-•*●▪◦‣]\s*/;

// "Frontend Developer at Acme Corp" / "Frontend Developer @ Acme Corp"
const TITLE_AT_COMPANY = /^(.+?)\s+(?:at|@)\s+(.+)$/i;
// "Acme Corp — Frontend Developer" (typographic dash only - a plain hyphen
// is too common inside real titles, e.g. "Front-end Developer", to treat as
// a separator).
const COMPANY_DASH_TITLE = /^(.+?)\s*[—–]\s*(.+)$/;

function splitEntryBlocks(sectionText: string): string[] {
  return sectionText
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);
}

function stripBullet(line: string): string {
  return line.replace(BULLET_PREFIX, '').trim();
}

interface CompanyAndTitle {
  company?: string;
  title?: string;
  // Whether an explicit connector ("at"/"@"/dash) told us how to split the
  // line, vs. a positional guess. Feeds directly into parseConfidence below.
  fromExplicitConnector: boolean;
}

function parseCompanyAndTitle(metaLines: string[]): CompanyAndTitle {
  for (const line of metaLines) {
    const atMatch = line.match(TITLE_AT_COMPANY);
    if (atMatch) return { title: atMatch[1].trim(), company: atMatch[2].trim(), fromExplicitConnector: true };
  }

  for (const line of metaLines) {
    const dashMatch = line.match(COMPANY_DASH_TITLE);
    if (dashMatch) return { company: dashMatch[1].trim(), title: dashMatch[2].trim(), fromExplicitConnector: true };
  }

  // No connector found - fall back to positional convention:
  // company first, title second (e.g. "Google" / "Software Engineer").
  // This is a documented assumption, not a detected fact - real resumes are
  // genuinely ambiguous here without an "at"/"@" connector.
  if (metaLines.length >= 2) {
    return { company: metaLines[0], title: metaLines[1], fromExplicitConnector: false };
  }
  if (metaLines.length === 1) {
    return { title: metaLines[0], fromExplicitConnector: false };
  }
  return { fromExplicitConnector: false };
}

// 0..100, same scale as value-objects/confidence.ts. Rewards signals that
// are actually diagnostic of a correct split - an explicit connector is
// worth much more than "we found two lines and guessed an order".
function scoreExperienceConfidence(args: {
  hasCompany: boolean;
  hasTitle: boolean;
  fromExplicitConnector: boolean;
  hasDate: boolean;
  hasBullets: boolean;
}): number {
  let score = 20;
  if (args.hasCompany) score += 20;
  if (args.hasTitle) score += 20;
  if (args.fromExplicitConnector) score += 15;
  if (args.hasDate) score += 15;
  if (args.hasBullets) score += 10;
  return Math.min(100, score);
}

function parseEntry(block: string): Experience {
  const rawLines = block.split('\n').map(line => line.trim()).filter(Boolean);
  if (!rawLines.length) return {};

  // A bullet-prefixed line is a strong "this is body content, not meta"
  // signal - but the prefix itself is just formatting noise once that
  // signal has been read, so it's stripped from every line up front. Some
  // resumes bullet the company/role line itself ("- Acme Corp — Dev"), so
  // meta lines need the same cleanup as bullet lines do.
  const isBulletLine = rawLines.map(line => BULLET_PREFIX.test(line));
  const lines = rawLines.map(stripBullet);

  let startDate: string | undefined;
  let endDate: string | undefined;
  let dateLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const range = extractDateRange(lines[i]);
    if (range) {
      startDate = range.startDate;
      endDate = range.endDate;
      dateLineIndex = i;
      // Dates are often embedded inline in parens ("Role (2021-2024)") -
      // clean up what the removal leaves behind.
      lines[i] = range.remainder.replace(/\(\s*\)/g, '').replace(/[-–—,]\s*$/, '').trim();
      break;
    }
  }

  const firstBulletIndex = isBulletLine.findIndex(Boolean);
  let metaEndIndex: number;
  if (dateLineIndex !== -1) {
    metaEndIndex = dateLineIndex;
  } else if (firstBulletIndex !== -1) {
    metaEndIndex = firstBulletIndex - 1;
  } else {
    // No date, no bullets: assume the first couple of lines are
    // company/title and anything else is descriptive content.
    metaEndIndex = Math.min(lines.length, 2) - 1;
  }

  const metaLines = lines.slice(0, metaEndIndex + 1).filter(Boolean);
  const bulletLines = lines.slice(metaEndIndex + 1).filter(Boolean);

  const { company, title, fromExplicitConnector } = parseCompanyAndTitle(metaLines);

  const entry: Experience = {};
  if (company) entry.company = company;
  if (title) entry.title = title;
  if (startDate) entry.startDate = startDate;
  if (endDate) entry.endDate = endDate;
  if (bulletLines.length) entry.bullets = bulletLines;
  entry.parseConfidence = scoreExperienceConfidence({
    hasCompany: Boolean(company),
    hasTitle: Boolean(title),
    fromExplicitConnector,
    hasDate: Boolean(startDate || endDate),
    hasBullets: bulletLines.length > 0
  });
  return entry;
}

// Phase 2: turns the flat `experience` blob from parseResumeSections into
// structured entries. Blank lines (preserved by parseResumeSections) are
// what separate one job from the next.
export function parseExperienceSection(sectionText: string | undefined): Experience[] {
  if (!sectionText || !sectionText.trim()) return [];
  return splitEntryBlocks(sectionText).map((block, index) => ({
    id: `exp-${index + 1}`,
    ...parseEntry(block)
  }));
}
