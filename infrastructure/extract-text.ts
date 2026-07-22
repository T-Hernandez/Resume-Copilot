import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { PositionedItem, reconstructColumnAwareText, reconstructLines } from './pdf-column-layout';

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

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const columnAware = await tryExtractColumnAwareText(buffer);
  if (columnAware !== undefined) return columnAware;

  const parser = new PDFParse({ data: buffer });
  try {
    // pdf-parse's default pageJoiner ('\n-- page_number of total_number --')
    // is meant for human-readable multi-page debugging output, not text
    // meant for further parsing - left at its default, it inserts literal
    // "-- 1 of 1 --"-style lines into the extracted text, which
    // parseResumeSections then has to (and cannot correctly) make sense of
    // as if it were real resume content. Disabled entirely: nothing
    // downstream needs a page-boundary marker.
    const result = await parser.getText({ pageJoiner: '' });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
