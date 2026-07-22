// pdf-parse's own getText() (see extract-text.ts) walks PDF text items in
// content-stream order and decides line breaks only from the immediately
// preceding item's Y position - it never sorts by position. For a single-
// column resume that's fine, because content-stream order already roughly
// follows reading order. For a two-column/sidebar template (common in
// visually-designed resumes - a narrow sidebar for contact/skills next to a
// wider main column for experience/education), the two columns' lines often
// share similar Y positions, so they get interleaved line-by-line: a
// sidebar's "CONTACT" section and a main column's "EXPERIENCE" section end
// up scrambled into one incoherent stream, which parseResumeSections then
// cannot correctly split.
//
// This module works on real per-item (x, y) positions - obtained directly
// from pdfjs-dist, which pdf-parse wraps but does not expose coordinates
// for through its own public API (see extract-text.ts) - and reconstructs
// each column as its own contiguous block instead, when a real column
// layout is detected. A PDF's item positions must be correct for it to
// render correctly at all, so this holds regardless of how idiosyncratic
// the underlying content-stream order is.

export interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

// Two items within this many points of vertical distance are treated as
// the same line - matches pdf-parse's own default lineThreshold, kept
// consistent since that value is already proven against real fixtures.
const LINE_THRESHOLD = 4.6;

// Two items on the same line separated by more than this many points get a
// space inserted between them - otherwise adjacent glyphs/words within a
// single run would run together.
const CELL_THRESHOLD = 2;

// Two items on the same line separated by more than this many points are
// treated as separate cells (broken into their own output lines) instead of
// being joined at all - a layout like a multi-item skills "grid" places
// unrelated content side by side at the same Y, which is a break much like
// the page-level column gutter but local to just a few rows, so
// detectColumnGutter's whole-column band scan does not (and should not)
// catch it. Calibrated against a real resume's own side-by-side skills
// grid: the largest genuine same-phrase gap measured ~8pt (a timeline
// leading-year label, e.g. "2024   Cybersecurity Diploma"), while the grid's
// real cell boundaries measured 30-57pt - this sits well between the two.
const WIDE_GAP_THRESHOLD = 15;

// A column gutter must be at least this fraction of the page width to
// count as a real layout boundary, not just ordinary word/paragraph
// spacing within a single column of text.
const MIN_GUTTER_FRACTION = 0.04;

// Resolution used to scan for the gutter - fine enough to find a
// realistically narrow gutter without being sensitive to individual
// glyph-width rounding.
const GUTTER_BIN_COUNT = 300;

// Ignore this fraction of the page at each edge when scanning for a gutter
// - a real column boundary sits between two columns of content, not at the
// page margin.
const GUTTER_MARGIN_FRACTION = 0.03;

// A gap between two lines this many times larger than the page's own
// typical line-to-line gap marks a real visual break (a new box/section),
// not just normal paragraph line spacing. section-headers.ts's own header
// heuristic gives a short, all-caps, single-word header (a common resume
// section title) only enough score to pass its recognition threshold when
// a blank line precedes it - without one, headers like "LANGUAGES" or
// "CERTIFICATIONS" silently fail to be recognized as a new section at all,
// and everything after them keeps flowing into whatever section was
// already open. Calibrated against a real two-column resume: true section
// breaks measured ~2.5-4x the page's typical line gap, while the largest
// gaps *within* one entry (e.g. a title line to its first description
// line) stayed under ~2.3x - this sits between the two.
const PARAGRAPH_BREAK_MULTIPLIER = 2.3;

// Finds the widest empty vertical band on the page (excluding margins), and
// returns its horizontal center as the column boundary - or undefined if no
// band wide enough to be a real gutter exists (the common case: a normal,
// single-column resume, where this must stay a no-op).
export function detectColumnGutter(items: PositionedItem[], pageWidth: number): number | undefined {
  if (!items.length || pageWidth <= 0) return undefined;

  const binWidth = pageWidth / GUTTER_BIN_COUNT;
  const occupied = new Array(GUTTER_BIN_COUNT).fill(false);
  for (const item of items) {
    const startBin = Math.max(0, Math.floor(item.x / binWidth));
    const endBin = Math.min(GUTTER_BIN_COUNT - 1, Math.ceil((item.x + item.width) / binWidth));
    for (let bin = startBin; bin <= endBin; bin++) occupied[bin] = true;
  }

  const marginBins = Math.round(GUTTER_BIN_COUNT * GUTTER_MARGIN_FRACTION);
  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;
  let currentLength = 0;
  for (let bin = marginBins; bin < GUTTER_BIN_COUNT - marginBins; bin++) {
    if (!occupied[bin]) {
      if (currentStart === -1) currentStart = bin;
      currentLength++;
    } else {
      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
      }
      currentStart = -1;
      currentLength = 0;
    }
  }
  if (currentLength > bestLength) {
    bestLength = currentLength;
    bestStart = currentStart;
  }

  if (bestLength < GUTTER_BIN_COUNT * MIN_GUTTER_FRACTION) return undefined;
  return (bestStart + bestLength / 2) * binWidth;
}

// Groups items into lines by Y-proximity, then joins each line left to
// right by X - the same two-step reconstruction pdf-parse's own getText()
// does, just driven by real position instead of content-stream order. A
// blank string in the result marks a real visual break (see
// PARAGRAPH_BREAK_MULTIPLIER) - callers that join with '\n' turn it into an
// actual blank line, the same signal parseResumeSections/splitEntryBlocks
// already look for in ordinary (non-reconstructed) extracted text.
export function reconstructLines(items: PositionedItem[]): string[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);

  const lineGroups: PositionedItem[][] = [];
  let current: PositionedItem[] = [];
  let currentY: number | undefined;
  for (const item of sorted) {
    if (currentY !== undefined && Math.abs(item.y - currentY) > LINE_THRESHOLD) {
      lineGroups.push(current);
      current = [];
    }
    current.push(item);
    currentY = item.y;
  }
  if (current.length) lineGroups.push(current);

  // Each line-group can itself resolve to more than one output line - see
  // WIDE_GAP_THRESHOLD above.
  const lineCells = lineGroups.map(group => {
    group.sort((a, b) => a.x - b.x);
    const cells: string[] = [''];
    let lastEndX: number | undefined;
    for (const item of group) {
      if (lastEndX !== undefined) {
        const gap = item.x - lastEndX;
        if (gap > WIDE_GAP_THRESHOLD) cells.push('');
        else if (gap > CELL_THRESHOLD) cells[cells.length - 1] += ' ';
      }
      cells[cells.length - 1] += item.str;
      lastEndX = item.x + item.width;
    }
    return cells.map(cell => cell.trim()).filter(Boolean);
  });

  const lineYs = lineGroups.map(group => group[0].y);
  const gaps = lineYs.slice(1).map((y, index) => y - lineYs[index]).filter(gap => gap > 0);
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0;

  const output: string[] = [];
  lineCells.forEach((cells, index) => {
    if (!cells.length) return;
    if (index > 0 && medianGap > 0) {
      const gap = lineYs[index] - lineYs[index - 1];
      if (gap > medianGap * PARAGRAPH_BREAK_MULTIPLIER && output.length && output[output.length - 1] !== '') {
        output.push('');
      }
    }
    output.push(...cells);
  });
  return output;
}

// Splits items into (up to) two columns at the detected gutter and
// reconstructs each as its own contiguous block of lines, wider (more
// text) column first - the common case for a sidebar template is that the
// sidebar (contact info, short skill labels) has much less text than the
// main column (summary, experience, education), so this is a reasonable,
// though not infallible, guess at which one is the "main" content a reader
// would expect first. Returns undefined when no real gutter is found, so
// the caller can fall back to the proven, unmodified extraction path.
export function reconstructColumnAwareText(items: PositionedItem[], pageWidth: number): string | undefined {
  const gutterX = detectColumnGutter(items, pageWidth);
  if (gutterX === undefined) return undefined;

  const left = items.filter(item => item.x < gutterX);
  const right = items.filter(item => item.x >= gutterX);
  const leftChars = left.reduce((sum, item) => sum + item.str.length, 0);
  const rightChars = right.reduce((sum, item) => sum + item.str.length, 0);
  const [primary, secondary] = leftChars >= rightChars ? [left, right] : [right, left];

  // A blank line at the column boundary itself, same reasoning as
  // PARAGRAPH_BREAK_MULTIPLIER above - the secondary column's first line
  // (often a short header like "CONTACT") needs one to be recognized.
  return [...reconstructLines(primary), '', ...reconstructLines(secondary)].join('\n');
}
