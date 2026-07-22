import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { PositionedItem, reconstructColumnAwareText, reconstructLines } from './pdf-column-layout';
import { htmlToStructuredText } from './docx-structured-text';
import { extractTextViaOcr } from './ocr-pdf';

// Second infrastructure-layer concern, same boundary as
// claude-recommendation-generator.ts: raw file-format extraction is not
// domain work, so it lives here, not under 01-domain. Both functions return
// plain text - the exact same input shape parseResumeDocument/
// parseJobDocument already accept, so nothing downstream of extraction
// changes at all. This is deliberately the only responsibility of this
// file: turn bytes into text. Structuring that text is still the domain's
// job.

// pdfjs-dist's Node build only ships as ESM (pdf.mjs) - loaded via dynamic
// import (works from this CommonJS-compiled file; a static import would not
// - see project notes) rather than as a static import, and lazily/cached so
// a PDF-free run (DOCX, or a plain-text resume) never pays for it.
let pdfjsPromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | undefined;
function loadPdfjs() {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

// See pdf-column-layout.ts for why this exists. Returns undefined (not a
// best-effort guess) whenever no real column gutter is found, or anything
// about reading this PDF's low-level structure goes wrong - column-aware
// reconstruction is a quality improvement on top of the proven pdf-parse
// path below, never a requirement for extraction to succeed.
async function tryExtractColumnAwareText(buffer: Buffer): Promise<string | undefined> {
  try {
    const pdfjs = await loadPdfjs();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), verbosity: 0 }).promise;
    try {
      const pageTexts: string[] = [];
      let anyGutterFound = false;

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        const items: PositionedItem[] = [];
        for (const raw of textContent.items) {
          if (!('str' in raw) || !raw.str.trim()) continue;
          const [x, y] = viewport.convertToViewportPoint(raw.transform[4], raw.transform[5]);
          items.push({ str: raw.str, x, y, width: raw.width });
        }
        page.cleanup();

        const columnText = reconstructColumnAwareText(items, viewport.width);
        if (columnText !== undefined) {
          anyGutterFound = true;
          pageTexts.push(columnText);
        } else {
          // No gutter on this specific page (e.g. a multi-page resume
          // whose later pages are plain single-column) - still needs its
          // own text, just via straightforward position-sorted
          // reconstruction rather than a column split it doesn't have.
          pageTexts.push(reconstructLines(items).join('\n'));
        }
      }

      // Only worth using when at least one page actually had a real column
      // split - otherwise this would just be a slower, less-proven
      // reimplementation of what pdf-parse's own getText() already does
      // correctly, for no benefit.
      return anyGutterFound ? pageTexts.join('\n\n') : undefined;
    } finally {
      await doc.destroy();
    }
  } catch {
    return undefined;
  }
}

// Below this length, extracted text is treated as "nothing real came out of
// this PDF" rather than a genuinely sparse-but-real resume - a scanned page
// has zero text objects and produces literal empty output, not just a
// short one, so this only ever misfires on an actually-empty PDF (which OCR
// would also find nothing in, so falling through to it is harmless either
// way).
const MIN_MEANINGFUL_TEXT_LENGTH = 10;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const columnAware = await tryExtractColumnAwareText(buffer);
  if (columnAware !== undefined) return columnAware;

  const parser = new PDFParse({ data: buffer });
  let text: string;
  try {
    // pdf-parse's default pageJoiner ('\n-- page_number of total_number --')
    // is meant for human-readable multi-page debugging output, not text
    // meant for further parsing - left at its default, it inserts literal
    // "-- 1 of 1 --"-style lines into the extracted text, which
    // parseResumeSections then has to (and cannot correctly) make sense of
    // as if it were real resume content. Disabled entirely: nothing
    // downstream needs a page-boundary marker.
    const result = await parser.getText({ pageJoiner: '' });
    text = result.text;
  } finally {
    await parser.destroy();
  }

  if (text.trim().length >= MIN_MEANINGFUL_TEXT_LENGTH) return text;

  // A scanned/photographed resume (no text layer at all) reaches here -
  // see ocr-pdf.ts. Failures here (a corrupt file that also has no text,
  // OCR dependencies unavailable, etc.) surface the original empty text
  // rather than throwing, so a genuinely-empty-but-valid PDF still resolves
  // to the same "empty resume" warning it always has instead of a 500.
  try {
    const ocrText = await extractTextViaOcr(buffer);
    return ocrText.trim().length > 0 ? ocrText : text;
  } catch {
    return text;
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  // Not mammoth's own extractRawText() - it joins every paragraph with a
  // blank line unconditionally, which turns a real bulleted job description
  // into one orphaned "entry" per bullet. ignoreEmptyParagraphs: false keeps
  // a genuinely empty paragraph in the output (as <p></p>) instead of
  // mammoth's default of silently dropping it - the one recoverable signal
  // for "a real break belongs here". See docx-structured-text.ts.
  const result = await mammoth.convertToHtml({ buffer }, { ignoreEmptyParagraphs: false });
  return htmlToStructuredText(result.value);
}
