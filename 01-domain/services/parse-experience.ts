import { Experience } from '../entities/experience';
import { extractDateRange } from './parse-date-range';
import { splitEntryBlocks } from './split-entry-blocks';

const BULLET_PREFIX = /^[-•*●▪◦‣]\s*/;

// "Frontend Developer at Acme Corp" / "Frontend Developer @ Acme Corp"
const TITLE_AT_COMPANY = /^(.+?)\s+(?:at|@)\s+(.+)$/i;
// "Acme Corp — Frontend Developer" (typographic dash only - a plain hyphen
// is too common inside real titles, e.g. "Front-end Developer", to treat as
// a separator).
const COMPANY_DASH_TITLE = /^(.+?)\s*[—–]\s*(.+)$/;

// "Cybersecurity Reporting Assistant - Kiggu" - a plain hyphen, but padded
// by whitespace on both sides, which a compound-word hyphen ("Front-end")
// never is. Checked only after COMPANY_DASH_TITLE finds no typographic dash,
// so a real em/en-dash line is never reinterpreted here.
const COMPANY_HYPHEN_TITLE = /^(.+?)\s+-\s+(.+)$/;

// Which side of a dash is the title is genuinely ambiguous - "Company —
// Title" and "Title — Company" (e.g. "AI & Product Developer — Ameliapp")
// both appear in real resumes. A recognizable job-title word is a real
// signal for which side is which; not exhaustive, just the common roles.
const TITLE_KEYWORDS = /\b(developer|engineer|manager|assistant|intern|director|analyst|designer|consultant|specialist|lead|officer|coordinator|founder|ceo|cto|cfo|coo|president|architect|scientist|researcher|technician|administrator|executive|supervisor|representative|associate|strategist|producer)\b/i;

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

  for (const dashPattern of [COMPANY_DASH_TITLE, COMPANY_HYPHEN_TITLE]) {
    for (const line of metaLines) {
      const dashMatch = line.match(dashPattern);
      if (dashMatch) {
        const [, first, second] = dashMatch;
        // Only override the "Company — Title" default when a title keyword
        // appears on exactly one side - if neither side (or both sides) has
        // one, the read is still genuinely ambiguous, so the existing default
        // order is kept rather than guessing further.
        if (TITLE_KEYWORDS.test(first) && !TITLE_KEYWORDS.test(second)) {
          return { title: first.trim(), company: second.trim(), fromExplicitConnector: true };
        }
        return { company: first.trim(), title: second.trim(), fromExplicitConnector: true };
      }
    }
  }

  // No connector found - fall back to positional convention:
  // company first, title second (e.g. "Google" / "Software Engineer").
  // This is a documented assumption, not a detected fact - real resumes are
  // genuinely ambiguous here without an "at"/"@" connector. Same keyword
  // override as the dash conventions above: a label/value-style entry
  // ("2023 - Present" / "Backend Engineer" / "Nimbus Labs", one field per
  // line, no connector at all - see the timeline-date fallback in
  // parseEntry) just as often puts the title line first, and a recognizable
  // title keyword on exactly one of the two lines is real evidence, not a
  // guess, for which one that is.
  if (metaLines.length >= 2) {
    const [first, second] = metaLines;
    if (TITLE_KEYWORDS.test(first) && !TITLE_KEYWORDS.test(second)) {
      return { title: first, company: second, fromExplicitConnector: false };
    }
    return { company: first, title: second, fromExplicitConnector: false };
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

// A meta (company/title) line is normally short - a handful of words, no
// sentence-ending (or mid-sentence, wrapped-line) punctuation. Only used for
// the no-date/no-bullet fallback above, where nothing else already bounds
// where "meta" content ends. Trailing comma counts too: a real company/title
// line never ends in one, but a long sentence that a column-narrow PDF
// wrapped across several physical lines often does ("...identifying,\n
// analyzing and reporting...") - without it, a short wrapped fragment reads
// as a short, punctuation-free "title" instead of the description it is.
function looksLikeProse(line: string): boolean {
  const wordCount = line.split(/\s+/).filter(Boolean).length;
  return wordCount > 8 || /[.,!?]$/.test(line);
}

// A line that is nothing but a 4-digit year (optionally parenthesized) -
// the "2025" on its own line/label convention (common in timeline-style
// templates), distinct from a full range ("2022 - 2024"). Deliberately
// requires the WHOLE line to be just the year, not merely contain one - a
// year mentioned inside a bullet ("grew revenue in 2025") is prose, not a
// date field, and must be left alone.
const BARE_YEAR_LINE = /^\(?(\d{4})\)?[.,;:]?$/;

// The same convention as BARE_YEAR_LINE, but the year is immediately
// followed by more content on the same line ("2025 AI & Product Developer
// — Ameliapp") instead of sitting alone - confirmed against real
// column-aware PDF reconstruction (see infrastructure/pdf-column-layout.ts),
// where a timeline year and its role land on one reconstructed line. Only
// ever checked against the block's first line - a bullet deep in the block
// that happens to start with a year ("2020 saw record growth...") must
// never be misread as a date field.
const LEADING_YEAR_WITH_REMAINDER = /^\(?(\d{4})\)?[.,;:]?\s+([A-Za-z].*)$/;

function parseEntry(block: string): Experience {
  const rawLinesAll = block.split('\n').map(line => line.trim()).filter(Boolean);
  if (!rawLinesAll.length) return {};

  // Pulled out before anything else so it's never mistaken for a
  // company/title candidate line, regardless of where it sits in the block
  // (this template convention puts it before the role, not after). Read as
  // a *start* date, not an end date: a lone year on an experience entry
  // states when it began (especially for a current/most-recent role), the
  // mirror image of parseEducationSection's bare graduation year, which is
  // read as an end date instead.
  let bareYearStart: string | undefined;
  let rawLines = rawLinesAll;
  const bareYearIndex = rawLinesAll.findIndex(line => BARE_YEAR_LINE.test(line));
  if (bareYearIndex !== -1) {
    bareYearStart = rawLinesAll[bareYearIndex].replace(/[().,;:]/g, '');
    rawLines = rawLinesAll.filter((_, i) => i !== bareYearIndex);
  } else {
    const leadingMatch = rawLinesAll[0].match(LEADING_YEAR_WITH_REMAINDER);
    if (leadingMatch) {
      bareYearStart = leadingMatch[1];
      rawLines = [leadingMatch[2], ...rawLinesAll.slice(1)];
    }
  }
  if (!rawLines.length) return {};

  // A bullet-prefixed line is a strong "this is body content, not meta"
  // signal - but the prefix itself is just formatting noise once that
  // signal has been read, so it's stripped from every line up front. Some
  // resumes bullet the company/role line itself ("- Acme Corp — Dev"), so
  // meta lines need the same cleanup as bullet lines do.
  const isBulletLine = rawLines.map(line => BULLET_PREFIX.test(line));
  const lines = rawLines.map(stripBullet);

  let startDate: string | undefined = bareYearStart;
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
    // company/title - but stop earlier if one of those two lines is
    // clearly an unbulleted description paragraph rather than a real meta
    // line (a company/title line is normally a handful of words; a
    // sentence-length line that was never bulleted is body content that
    // still needs to land in bullets, not get read as "the title").
    const proseIndex = lines.findIndex(looksLikeProse);
    const cap = proseIndex === -1 ? lines.length : proseIndex;
    metaEndIndex = Math.min(cap, 2) - 1;
  }

  let metaLines = lines.slice(0, metaEndIndex + 1).filter(Boolean);
  let bulletLines = lines.slice(metaEndIndex + 1).filter(Boolean);

  // A date that sits entirely on its own line (a timeline-style label -
  // "2023 - Present" with nothing else on it, common in Europass-style and
  // other label/value templates) leaves metaLines empty: the inline-date
  // convention this logic is otherwise built for ("Frontend Developer
  // (2021-2024)") assumes the meta content comes BEFORE the date, but here
  // the real company/title lines are immediately AFTER it instead. Borrows
  // up to 2 of those lines back into metaLines - same "stop at the first
  // prose-looking line" rule the no-date/no-bullet fallback above already
  // uses - but only when the very next line is not itself bulleted, since a
  // real bullet there is a stronger, more specific signal that the
  // description already starts immediately after the date with no meta
  // content at all.
  if (!metaLines.length && dateLineIndex !== -1 && bulletLines.length) {
    const nextContentIndex = lines.findIndex((line, i) => i > metaEndIndex && line);
    const nextLineIsBulleted = nextContentIndex !== -1 && isBulletLine[nextContentIndex];
    if (!nextLineIsBulleted) {
      const proseIndex = bulletLines.findIndex(looksLikeProse);
      const cap = proseIndex === -1 ? bulletLines.length : proseIndex;
      const borrowCount = Math.min(cap, 2);
      metaLines = bulletLines.slice(0, borrowCount);
      bulletLines = bulletLines.slice(borrowCount);
    }
  }

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
