// mammoth's own extractRawText() (see raw-text.js in the mammoth package)
// joins EVERY paragraph with a blank line, unconditionally - it has no
// notion of "this paragraph is the next bullet in the same list" versus "a
// genuinely new paragraph". For a resume where a job's bullet points are
// real Word list items (or even just typed as their own plain paragraph
// under the title, with no blank line pressed in between), that turns each
// bullet into what looks like its own blank-line-separated block - exactly
// the signal parseResumeSections/splitEntryBlocks use to start a new
// experience/education entry. A title followed by three bullets becomes
// four "entries": one real one and three orphaned bullet fragments with no
// company/title at all.
//
// mammoth.convertToHtml() (called with ignoreEmptyParagraphs: false - see
// extract-text.ts) already carries the structure needed to get this right:
// consecutive bullets render as sibling <li> inside one <ul>, distinct from
// a new <p>, and a genuinely blank paragraph (the real signal a resume
// author leaves between two jobs) survives as an empty <p></p> instead of
// being silently dropped, which is mammoth's default. This module rebuilds
// plain text from that HTML instead of using extractRawText directly:
// bullets within one list join with a single newline (same entry); an
// empty <p></p> becomes an explicit blank-line marker (a real entry/section
// break); everywhere else - two adjacent non-empty <p> elements with
// nothing pressed between them in the source, or a list ending and a plain
// paragraph following - joins with a single newline, not a blank line,
// since nothing in the source document signaled a break there.
//
// Scoped to the subset of tags mammoth's own converter actually emits for a
// resume (p/h1-6/ul/ol/li/table/tr/td, plus inline formatting) - this is
// not a general HTML parser, and does not need to be one: the input is
// mammoth's own well-formed output, not arbitrary/untrusted HTML.

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  nbsp: ' '
};

function unescapeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, (match, code: string) => {
    if (code in ENTITIES) return ENTITIES[code];
    if (code.startsWith('#x')) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return match;
  });
}

// Strips any remaining inline tags (strong/em/u/a/span/...) within a single
// block's inner HTML, keeping their text - a resume's meaning never depends
// on bold/italic/link markup, only the words themselves. A manual line
// break (<br>, Shift+Enter in Word) becomes a space rather than a real
// newline - keeping the per-block text model to one line, since resumes
// only rarely rely on a soft break for meaning (e.g. an address block) and
// a joined line degrades gracefully there instead of adding a second line
// shape every caller of htmlToLines would need to account for.
function htmlToText(innerHtml: string): string {
  const withoutBreaks = innerHtml.replace(/<br\s*\/?>/gi, ' ');
  const withoutTags = withoutBreaks.replace(/<[^>]+>/g, '');
  return unescapeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

// Naive (non-depth-aware) matching of the first closing tag - correct for
// mammoth's own output, which never nests a <table> inside a <table> or a
// <ul>/<ol> inside another for a resume's actual content. Returns the index
// just past the closing tag, or the end of the string if unclosed (should
// not happen against well-formed mammoth output, but fails open rather than
// throwing on a malformed edge case).
function findBlockEnd(html: string, fromIndex: number, tagName: string): number {
  const closeTag = `</${tagName}>`;
  const closeIndex = html.indexOf(closeTag, fromIndex);
  return closeIndex === -1 ? html.length : closeIndex + closeTag.length;
}

function extractListItems(listInnerHtml: string): string[] {
  const items: string[] = [];
  const pattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(listInnerHtml))) {
    const text = htmlToText(match[1]);
    if (text) items.push(text);
  }
  return items;
}

function extractCells(rowInnerHtml: string): string[] {
  const cells: string[] = [];
  const pattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(rowInnerHtml))) {
    cells.push(match[1]);
  }
  return cells;
}

// A blank string marks a real paragraph/section break - the same
// blank-string-as-line-break convention reconstructLines() in
// pdf-column-layout.ts already uses, so both extractors hand
// parseResumeSections the same shape.
export function htmlToLines(html: string): string[] {
  const lines: string[] = [];
  let pos = 0;

  const pushBlank = () => {
    if (lines.length && lines[lines.length - 1] !== '') lines.push('');
  };

  const BLOCK_START = /<(p|h[1-6]|ul|ol|table)\b[^>]*>/i;

  while (pos < html.length) {
    const rest = html.slice(pos);
    const match = BLOCK_START.exec(rest);
    if (!match || match.index === undefined) break;

    const tagName = match[1].toLowerCase();
    const tagStart = pos + match.index;
    const contentStart = tagStart + match[0].length;

    if (tagName === 'p' || /^h[1-6]$/.test(tagName)) {
      const blockEnd = findBlockEnd(html, contentStart, tagName);
      const closeLen = `</${tagName}>`.length;
      const text = htmlToText(html.slice(contentStart, blockEnd - closeLen));
      // A genuinely empty paragraph (mammoth only keeps these when called
      // with ignoreEmptyParagraphs: false - see extract-text.ts) is the
      // resume author's own real signal for a break between two entries or
      // sections - the one and only place a blank line gets inserted here.
      // Two non-empty paragraphs with nothing pressed between them in the
      // source join with a single newline instead, same as list items do.
      if (text) lines.push(text);
      else pushBlank();
      pos = blockEnd;
    } else if (tagName === 'ul' || tagName === 'ol') {
      const blockEnd = findBlockEnd(html, contentStart, tagName);
      const closeLen = `</${tagName}>`.length;
      const items = extractListItems(html.slice(contentStart, blockEnd - closeLen));
      // Bullets of the same list are the same entry's description - a
      // single newline between them, never a blank line, is the whole
      // point of this module.
      for (const item of items) lines.push(`- ${item}`);
      pos = blockEnd;
    } else if (tagName === 'table') {
      const blockEnd = findBlockEnd(html, contentStart, tagName);
      const closeLen = '</table>'.length;
      const tableInner = html.slice(contentStart, blockEnd - closeLen);
      const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
      const cellGroups: string[][] = [];
      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = rowPattern.exec(tableInner))) {
        for (const cellHtml of extractCells(rowMatch[1])) {
          cellGroups.push(htmlToLines(cellHtml));
        }
      }
      pushBlank();
      cellGroups.forEach((cellLines, index) => {
        if (index > 0) lines.push('');
        lines.push(...cellLines);
      });
      pos = blockEnd;
    } else {
      pos = contentStart;
    }
  }

  return lines;
}

export function htmlToStructuredText(html: string): string {
  return htmlToLines(html).join('\n');
}
