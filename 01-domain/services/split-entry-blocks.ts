// Shared by parseExperienceSection and parseEducationSection: an
// Experience/Education section is a sequence of entries, normally separated
// by a blank line. Column-aware PDF text reconstruction (see
// infrastructure/pdf-column-layout.ts) does not reliably preserve that
// blank line between entries - the vertical gap between one entry's last
// description line and the next entry's first line can be about the same
// size as the gap between that next entry's own title and its first
// description line, so there is no Y-distance threshold that tells them
// apart. A line that opens with a bare year ("2025 ...", "(2025) ...") is a
// second, independent signal that a new entry is starting, common to both
// section types in a timeline-style resume - splitting on it too is purely
// additive: it only ever adds a boundary a normally blank-line-separated
// resume would already have.
// Requires a letter right after the year (not a digit or dash) so a real
// date range's first token ("2020 - 2022", "2020 to 2022") is never
// mistaken for this - extractDateRange already owns that case, entirely
// within one entry, and must not be split apart by this.
const LEADING_YEAR_ENTRY_START = /^\(?\d{4}\)?[.,;:]?\s+[A-Za-z]/;

export function splitEntryBlocks(sectionText: string): string[] {
  const withEntryBoundaries = sectionText
    .split('\n')
    .map((line, index) => (index > 0 && LEADING_YEAR_ENTRY_START.test(line) ? `\n${line}` : line))
    .join('\n');

  return withEntryBoundaries
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);
}
